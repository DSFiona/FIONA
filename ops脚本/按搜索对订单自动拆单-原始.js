/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 *根据搜索对指定订单进行拆单
 */
/*
* 搜索：增长事业部&增长自采订单拆单-程序用
* 背景：24年11月的时候，新增了一种“增长事业部&增长自采”类型货品，新类型货品没有办法适应之前的自动移库功能，
* 针对这个新型货品，和增长金蓉蓉对了一个方案，对包含这种类型的订单进行自动拆单。
* 脚本基本逻辑：
* 1、根据搜索拿到订单行信息
* 2、删除原套件行，查询套件下的子件信息，并新增到订单行
* 3、拆分的金额，根据货品的SKU平台信息的批发价，对每个子件按比例分摊得出
* 4、获取新订单的行ID，将行ID赋值到对应包裹行，与手动拆单操作一致
* 5、要注意，因为是删除再重新建立新行，可能会存在部分行字段丢失，需在代码中手动添加
* */
define([
	'N/record',
	'N/search','N/runtime','./moment'
], function(
	record,
	search,runtime,moment
) {

	function getInputData() {
		const datalist = [];
		var limit=4000;
		var mySearch = search.load({
			id:"customsearch_split_order"
		})
		mySearch.run().each(function (rec) {
			datalist.push(
				{
					orderId: rec.getValue(rec.columns[0]),
					itemID: rec.getValue(rec.columns[1]),
					lineId: rec.getValue(rec.columns[2]),
					kitRate: rec.getValue(rec.columns[3]),
					kitQuantity: rec.getValue(rec.columns[4]),
					locationDisplay: rec.getValue(rec.columns[5]),
					inventorylocationDisplay: rec.getValue(rec.columns[6]),
					aioAccount: rec.getValue(rec.columns[7])
				});
			return --limit>0;//映射脚本搜索最大取数限制4000
		});
		return datalist;
	}


	function reduce(context) {
		try {
			const obj = JSON.parse(context.values[0]);
			const orderId = obj.orderId; // 订单内部ID
			const itemID = obj.itemID; // 套件内部ID
			const lineId = obj.lineId; // 行ID
			const kitRate = parseFloat(obj.kitRate); // 套件原价
			const kitQuantity = parseFloat(obj.kitQuantity); // 套件数量
			const locationDisplay = obj.locationDisplay; // 地点
			const inventorylocationDisplay = obj.inventorylocationDisplay; // 库存地点
			const aioAccount = obj.aioAccount; //店铺

			// 加载套件货品记录，获取成员子件及其数量
			var recordObj = record.load({
				type: record.Type.KIT_ITEM,
				id: itemID // 使用 itemID 作为套件的内部ID
			});

			var lineQty = recordObj.getLineCount('member'); // 获取成员子件数量
			// 判断成员子件数量是否小于等于1
			if (lineQty <= 1) {
				log.debug('无需拆单，成员子件数量小于等于1,订单ID：', orderId);
				return;
			}
			var memberItems = []; // 用于存储成员子件的数组
			var memberQuantities = []; // 用于存储对应数量的数组

			for (var i = 0; i < lineQty; i++) {
				var memberItem = recordObj.getSublistValue({
					sublistId: 'member',
					fieldId: 'item',
					line: i
				});
				var memberQuantity = parseFloat(recordObj.getSublistValue({
					sublistId: 'member',
					fieldId: 'quantity',
					line: i
				})) || 1;
				memberItems.push(memberItem);
				memberQuantities.push(memberQuantity);
			}

			// log.debug("成员子件信息类型", typeof memberItems);
			log.debug('成员子件信息', memberItems);
			log.debug('成员子件信息2', memberQuantities);

			// 创建搜索获取批发价
			var wholesalePrices = {}; // 存储每个成员子件的批发价
			var totalWholesaleValue = 0; // 用于计算总金额

			memberItems.forEach(function(memberItem, index) {
				var wholesaleSearch = search.create({
					type: "customrecord_k_the_platform_info",
					filters: [
						["custrecord_k_ecp_name", "anyof", aioAccount], // 根据订单店铺过滤
						"AND",
						["custrecord_k_sku_14k", "anyof", memberItem] // 根据成员子件过滤
					],
					columns: [
						search.createColumn({ name: "custrecord_k_whole_sale", label: "批发价" })
					]
				});

				// 获取搜索结果
				wholesaleSearch.run().each(function(result) {
					var wholesalePrice = parseFloat(result.getValue("custrecord_k_whole_sale"));
					wholesalePrices[memberItem] = wholesalePrice;
					totalWholesaleValue += wholesalePrice * memberQuantities[index]; // 加权金额
					return true; // 继续搜索
				});
			});

			// log.debug('批发价信息', wholesalePrices);
			// log.debug('批发价信息2', totalWholesaleValue);


			// 按批发价比例计算套件单价的分摊
			var inventoryRates = {}; // 存储子件分摊单价
			var allocatedTotal = 0; // 初始化已分配总金额

			// 计算总批发价和总的子件数量
			memberItems.forEach(function(memberItem, index) {
				var wholesalePrice = wholesalePrices[memberItem] || 0;
				var memberQuantity = memberQuantities[index];
				var itemTotalWholesale = wholesalePrice * memberQuantity; // 当前子件的批发价总额

				// 按批发价比例分摊套件原价
				var allocationRate = itemTotalWholesale / totalWholesaleValue; // 当前子件在总批发价中的占比
				var allocatedValue = allocationRate * kitRate / memberQuantity; // 当前子件的分摊金额，基于套件原价

				var roundedInventoryRate = parseFloat(allocatedValue.toFixed(2)); // 保留两位小数

				// 累积已分配金额
				allocatedTotal = allocatedTotal + (roundedInventoryRate * memberQuantity);
				inventoryRates[memberItem] = roundedInventoryRate;
			});

			// 计算误差并修正
			var difference = parseFloat((kitRate - allocatedTotal).toFixed(2)); // 计算误差
			if (Math.abs(difference) > 0.01 && memberItems.length > 0) {
				// 修正误差，将最后一个子件的单价调整
				var lastItem = memberItems[memberItems.length - 1];
				var lastRate = inventoryRates[lastItem];
				var lastQuantity = quantities[lastItem];
				// 根据数量调整单价增量
				var adjustmentPerUnit = parseFloat((difference / lastQuantity).toFixed(3));
				inventoryRates[lastItem] = parseFloat((lastRate + adjustmentPerUnit).toFixed(3));
			}
			log.debug('子件分摊单价', inventoryRates);

			// 编辑订单，删除套件所在行并新增子件行
			var salesOrder = record.load({
				type: record.Type.SALES_ORDER,
				id: orderId, // 订单内部ID
				isDynamic: true
			});

			// 删除套件所在行
			var lineCount = salesOrder.getLineCount({ sublistId: 'item' });
			for (var i = 0; i < lineCount; i++) {
				salesOrder.selectLine({ sublistId: 'item', line: i });
				var currentLineItem = salesOrder.getCurrentSublistValue({
					sublistId: 'item',
					fieldId: 'item'
				});

				if (currentLineItem == itemID) { // 找到套件行
					salesOrder.removeLine({
						sublistId: 'item',
						line: i
					});
					break;
				}
			}

			// 新增子件行
			memberItems.forEach(function (memberItem, index) {
				var memberQuantity = memberQuantities[index]; // 子件数量
				var memberRate = inventoryRates[memberItem]; // 子件单价

				salesOrder.selectNewLine({ sublistId: 'item' });
				salesOrder.setCurrentSublistValue({
					sublistId: 'item',
					fieldId: 'item',
					value: memberItem
				});
				salesOrder.setCurrentSublistValue({
					sublistId: 'item',
					fieldId: 'quantity',
					value: kitQuantity * memberQuantity  // 子件数量为套件数量
				});
				salesOrder.setCurrentSublistValue({
					sublistId: 'item',
					fieldId: 'rate',
					value: memberRate // 子件单价
				});
				salesOrder.setCurrentSublistValue({
					sublistId: 'item',
					fieldId: 'location',
					value: locationDisplay // 设置库存地点
				});
				salesOrder.setCurrentSublistValue({
					sublistId: 'item',
					fieldId: 'inventorylocation',
					value: inventorylocationDisplay // 设置库存地点
				});

				salesOrder.commitLine({ sublistId: 'item' });
				// log.debug('新增子件行', {
				// 	item: memberItem,
				// 	quantity: kitQuantity,
				// 	rate: memberRate,
				// 	location: locationDisplay
				// });
			});

			salesOrder.setValue({
				fieldId: 'custbody122',
				value: true
			});

			// 保存订单
			var updatedOrderId = salesOrder.save();
			// log.debug('订单更新完成', `订单ID: ${updatedOrderId}`);

			// 重新加载订单
			var updatedSalesOrder = record.load({
				type: record.Type.SALES_ORDER,
				id: updatedOrderId, // 上一步保存的订单ID
				isDynamic: true
			});

			// 获取新增子件行的行ID
			var newLineIds = {}; // 存储子件ID与其行ID的映射
			var updatedLineCount = updatedSalesOrder.getLineCount({ sublistId: 'item' });
			for (var i = 0; i < updatedLineCount; i++) {
				updatedSalesOrder.selectLine({ sublistId: 'item', line: i });
				var currentItemId = updatedSalesOrder.getCurrentSublistValue({
					sublistId: 'item',
					fieldId: 'item'
				});
				var currentLineId = updatedSalesOrder.getCurrentSublistValue({
					sublistId: 'item',
					fieldId: 'line'
				});

				// 确保 includes 在数组上调用
				if (memberItems.indexOf(currentItemId.toString())!==-1) {
					newLineIds[currentItemId] = currentLineId;
					// log.debug('新增子件行信息', {
					// 	itemId: currentItemId,
					// 	lineId: currentLineId
					// });
				}
			}

			log.debug('所有新增子件行的行ID', newLineIds);

			// 如果是US-Homedepot和US-Lowes店铺订单，需要编辑aio_order_item_id字段
			if (aioAccount == 18 || aioAccount == 20) {
				memberItems.forEach(function (memberItem) {
					// 获取子件对应的行ID
					var lineId = newLineIds[memberItem];

					// 如果行ID存在，编辑对应行字段
					if (lineId) {
						for (var i = 0; i < updatedLineCount; i++) {
							updatedSalesOrder.selectLine({ sublistId: 'item', line: i });
							var currentItemId = updatedSalesOrder.getCurrentSublistValue({
								sublistId: 'item',
								fieldId: 'item'
							});
							var currentLineId = updatedSalesOrder.getCurrentSublistValue({
								sublistId: 'item',
								fieldId: 'line'
							});

							// 判断当前行是否是需要更新的行
							if (currentItemId == memberItem && currentLineId == lineId) {
								updatedSalesOrder.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'custcol_aio_order_item_id',
									value: lineId // 将行ID赋值给指定字段
								});

								updatedSalesOrder.commitLine({ sublistId: 'item' });
								// log.debug('更新字段 custcol_aio_order_item_id', {
								// 	item: memberItem,
								// 	lineId: lineId
								// });
							}
						}
					}
				});
				// 保存订单更新
				var finalOrderId = updatedSalesOrder.save();
				log.debug('订单已更新 custcol_aio_order_item_id 字段', finalOrderId);
			}

			// 创建搜索，找到订单下对应子件的包裹
			memberItems.forEach(function (memberItem) {
				var customrecord_logistics_packagesSearchObj = search.create({
					type: "customrecord_logistics_packages",
					filters: [
						["custrecord_logistics_packages_so", "anyof", updatedOrderId], // 使用订单ID作为搜索条件
						"AND",
						["custrecord_logistics_packages_item", "anyof", memberItem] // 使用子件ID作为搜索条件
					],
					columns: [
						search.createColumn({ name: "internalid", label: "内部 ID" })
					]
				});

				var searchResultCount = customrecord_logistics_packagesSearchObj.runPaged().count;
				// log.debug("包裹搜索结果数量", searchResultCount);

				customrecord_logistics_packagesSearchObj.run().each(function (result) {
					// 获取包裹内部ID
					var packageId = result.getValue({ name: "internalid" });

					// 编辑包裹记录
					var packageRecord = record.load({
						type: "customrecord_logistics_packages",
						id: packageId
					});

					// 设置包裹字段 custrecord_itme_line_key 为子件的行ID
					var lineId = newLineIds[memberItem]; // 获取子件对应的行ID
					packageRecord.setValue({
						fieldId: "custrecord_itme_line_key",
						value: lineId
					});

					packageRecord.save();
					// log.debug("包裹已更新", {
					// 	packageId: packageId,
					// 	item: memberItem,
					// 	lineId: lineId
					// });

					return true; // 继续处理下一个搜索结果
				});
			});
			log.debug('订单已拆分完成，ID：', orderId);

		} catch (e) {
			log.error('错误', e);
		}
	}

	function summarize(summary) {

	}

	return {
		getInputData: getInputData,
		reduce: reduce,
		summarize: summarize
	}
});