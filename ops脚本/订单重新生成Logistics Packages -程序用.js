/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
/*
* 搜索：订单重新生成Logistics Packages -程序用
* 功能背景介绍：NS生成包裹的脚本是用户事件类型脚本，可使用单元数量较少，当包裹行数量超过140时就会超出执行限制，导致包裹生成不完整。
* 此程序就是针对超出限制问题，制作的补偿程序。
* 脚本基本逻辑：
* 1、销售订单上新增字段“已生成LOGISTICS PACKAGES”，当原包裹脚本执行完成时会勾选此字段，反之未勾选的就是需要进行补偿的订单。
* 2、拿到销售订单后，删除原有的所有包裹行
* 3、按货品生成新的包裹行，生成逻辑和原包裹脚本一致
*/
define(["N/record", "N/search", "N/log", "N/task"],
    function (record, search, log, task) {

        function getInputData() {
            const datalist = [];
            var limit=4000;
            var mySearch = search.load({
                id:"customsearch_regenerate_package"
            })
            mySearch.run().each(function (rec) {
                datalist.push(
                    {
                        salesOrderId: rec.getValue(rec.columns[0])
                    });
                return --limit>0;//映射脚本搜索最大取数限制4000
            });
            return datalist;
        }

        function reduce(context) {
            const obj = JSON.parse(context.values[0]);
            const salesOrderId = obj.salesOrderId; // 订单内部ID
            log.debug("处理销售订单ID", salesOrderId);

            // 创建包裹搜索
            var customrecord_logistics_packagesSearchObj = search.create({
                type: "customrecord_logistics_packages",
                filters:
                    [
                        ["custrecord_logistics_packages_so.internalid","anyof",salesOrderId],
                        "AND",
                        ["custrecord_logistics_packages_so.mainline","is","T"]
                    ],
                columns:
                    [
                        search.createColumn({name: "internalid", label: "内部 ID"})
                    ]
            });

            // 执行搜索获取需要删除的包裹ID
            var packageIds = [];
            customrecord_logistics_packagesSearchObj.run().each(function (result) {
                var packageId = result.getValue(result.columns[0]);
                packageIds.push(packageId); // 收集包裹的ID
                return true;
            });
            // log.debug("需要删除的packageIds", packageIds);

            // 删除包裹
            if (packageIds.length > 0) {
                try {
                    for (var i = 0; i < packageIds.length; i++) {
                        record.delete({
                            type: "customrecord_logistics_packages",
                            id: packageIds[i]
                        });
                        // log.debug("删除包裹", { packageId: packageIds[i] });
                    }
                } catch (e) {
                    log.error("删除包裹错误！", JSON.stringify(e));
                }
            }

            //创建包裹
            try {
                var newRec = record.load({
                    type: record.Type.SALES_ORDER,
                    id: salesOrderId
                });
                var logistics_account = newRec.getValue("custbody_logistics_account"); 
                if (!logistics_account) return; //如果没有物流账户，跳过处理
                var tailLogistics = newRec.getValue("custbody94") // 获取尾程物流信息
                //计算当前订单的总产品数量
                var itemCount = newRec.getLineCount("item");
                var line = 1;
                for (var i = 0; i < itemCount; i++) {
                    var item = newRec.getSublistValue("item", "item", i);
                    // var realShip = newRec.getSublistValue("item", "custcol_realship", i);
                    var custcol_aio_order_item_id = newRec.getSublistValue("item", "custcol_aio_order_item_id", i);
                    var itemType = newRec.getSublistValue("item", "itemtype", i);
                    var quantity = newRec.getSublistValue("item", "quantity", i);
                    var location = newRec.getSublistValue("item", "location", i);
                    var lineId = newRec.getSublistValue("item", "line", i);
                    var tailLogistics
                    var homeDepot_lowes_ltl = newRec.getSublistValue("item", "custcol44", i);//2025.3.12新增-获取homeDepot和lowes的LTL测试环境
                    var urgentExpress = newRec.getSublistValue("item", "custcol_urgent_express", i);//2024.9.25新增-获取加急运输
                    // log.debug("itemType realShip sku-->",itemType+" "+realShip+" "+nsSkuCode)
                    if(homeDepot_lowes_ltl){
                        tailLogistics = homeDepot_lowes_ltl;
//                    log.debug("tailLogistics", tailLogistics);
                    }
                    if (itemType == 'Kit') {
                        kitItem = record.load({type: record.Type.KIT_ITEM, id: item});
                        tailLogistics = kitItem.getValue("custitem87");  // 获取套件的物流信息
                        var inventory_qty = 0, member_count = kitItem.getLineCount("member");
                        for (var j = 0; j < member_count; j++) {
                            var item_id = kitItem.getSublistValue("member", "item", j);
                            var item_qty = Number(kitItem.getSublistValue("member", "quantity", j));
                            item_qty = item_qty * quantity;
                            line = createPackages(newRec.id, item_id, item_qty, line, location, lineId, urgentExpress, tailLogistics,custcol_aio_order_item_id,itemType);
                        }
                    } else if (itemType == 'InvtPart') {
                        line = createPackages(newRec.id, item, quantity, line, location, lineId, urgentExpress, tailLogistics,custcol_aio_order_item_id,itemType);
                    }
                }
                newRec.setValue("custbody_logistics_packages_mark", true); // 将已生成LOGISTICS PACKAGES设置为勾选
                newRec.save();
                log.debug(newRec.getValue("otherrefnum"), "成功! 总行数: " + (line - 1));
            } catch (e) {
                log.error(newRec.getValue("otherrefnum"), JSON.stringify(e));
            }

        }

        function summarize(summary) {

        }

        function createPackages(order_id, item_id, item_qty, line, location, lineId, urgentExpress ,tailLogistics,custcol_aio_order_item_id,itemType) {
            line = line ? line : 1;
            for (var k = 0; k < item_qty; k++) {
                var columns = [];
                for (var i = 1; i <= 5; i++) {
                    var length_column, width_column, height_column;
                    if (i == 1) {
                        length_column = "custitem_k_long";
                        width_column = "custitem_k_wide";
                        height_column = "custitem_k_high";
                    } else {
                        length_column = "custitem_k_package_" + i + "depth";
                        width_column = "custitem_k_package_" + i + "width";
                        height_column = "custitem_k_package_" + i + "height";
                    }
                    var weight_column = "custitem_k_gw_" + i + "ibs";
                    columns.push(length_column);
                    columns.push(width_column);
                    columns.push(height_column);
                    columns.push(weight_column);
                }
                //获取库存SKU的重量
                var item_results = search.lookupFields({
                    type: record.Type.INVENTORY_ITEM,
                    id: item_id,
                    columns: columns
                });
                //循环获取包裹参数并创建包裹记录
                for (var i = 1; i <= 5; i++) {
                    var length_column, width_column, height_column;
                    if (i == 1) {
                        length_column = "custitem_k_long";
                        width_column = "custitem_k_wide";
                        height_column = "custitem_k_high";
                    } else {
                        length_column = "custitem_k_package_" + i + "depth";
                        width_column = "custitem_k_package_" + i + "width";
                        height_column = "custitem_k_package_" + i + "height";
                    }
                    var weight_column = "custitem_k_gw_" + i + "ibs";
                    var length = item_results[length_column];
                    var width = item_results[width_column];
                    var height = item_results[height_column];
                    var weight = item_results[weight_column];
                    //判断是否齐全
                    if (length && width && height && weight) {
                        var packageRec = record.create({type: "customrecord_logistics_packages"});
                        packageRec.setValue("custrecord_logistics_packages_so", order_id);
                        packageRec.setValue("custrecord_logistics_packages_item", item_id);
                        packageRec.setValue("custrecord_logistics_packages_line", line);
                        packageRec.setValue("custrecord_logistics_packages_weight", weight);
                        packageRec.setValue("custrecord_logistics_packages_length", length);
                        packageRec.setValue("custrecord_logistics_packages_width", width);
                        packageRec.setValue("custrecord_logistics_packages_height", height);
                        packageRec.setText("custrecord1515", tailLogistics);
                        if (location) {
                            packageRec.setValue("custrecord_logistics_packages_location", location);
                        }
                        packageRec.setValue("custrecord_itme_line_key", lineId);
                        packageRec.setValue("custrecord_logistics_urgent_express", urgentExpress);//2024.9.25新增-获取加急运输
                        packageRec.setValue("custrecord_fulfillment_order_lineitem_id",custcol_aio_order_item_id)
                        packageRec.setValue("custrecord_logistics_packages_item_type", itemType);

                        var logLogisticsPackagesId = packageRec.save({ignoreMandatoryFields: true});
                        log.debug(logLogisticsPackagesId, 'line:' + line);
                        line++;
                    }
                }
            }
            return line;
        }

        return {
            getInputData: getInputData,
            reduce: reduce,
            summarize: summarize
        };
    });