/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
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
            id:"customsearch1935"
        })
        mySearch.run().each(function (rec) {
            datalist.push(
                {
                    id: rec.getValue(rec.columns[0]),
                    trandate: rec.getValue(rec.columns[1]),
                    marketplace: rec.getValue(rec.columns[3]),
                });
            return --limit>0;//映射脚本搜索最大取数限制4000
            return true;
        });
        return datalist;

    }
    function reduce(context) {
        try{
            //log.debug('context', JSON.stringify(context))
            const obj = JSON.parse(context.values[0]);
            const id = obj.id;
            const trandate = obj.trandate;
            const marketplace = obj.marketplace;

            // 加载销售订单获取发运方式——2024/10/12添加修复ZG发运字段bug
            var salesOrderRecord = record.load({
                type: record.Type.SALES_ORDER,
                id: id
            });
            var SOShipMethod = salesOrderRecord.getValue({ fieldId: 'shipmethod' }); // 获取发运方式

            var paymentItems = []; // 存储 paymentitem 类型的货品行

            if (marketplace == "6") {

                var lineCount = salesOrderRecord.getLineCount({ sublistId: 'item' });
                for (var i = 0; i < lineCount; i++) {
                    var itemType = salesOrderRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'itemtype',
                        line: i
                    });

                    if (itemType === "Payment") { // 只记录 paymentitem 类型的行
                        log.debug("存在付款类型货品",itemType);
                        paymentItems.push({
                            item: salesOrderRecord.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                line: i
                            }),
                            rate: salesOrderRecord.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'rate',
                                line: i
                            }),
                            quantity: salesOrderRecord.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                line: i
                            })
                        });
                    }
                }
            }

            //生成退货授权returnauthorization
            var recordObj =  record.transform({
                fromType: "salesorder",
                fromId: id,
                toType: "returnauthorization",
            });
            var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
            //var date=moment.utc(trandate,dateFormat).format(dateFormat);
            var date = moment(trandate, 'M/D/YYYY').format(dateFormat);
            //var date = moment(trandate, 'YYYY-MM-DD').format(dateFormat);
            recordObj.setText('trandate',date);//通过文本形式赋值
            var inid=recordObj.save();

            // 如果 paymentItems 不为空，则在 returnauthorization 添加这些行
            if (paymentItems.length > 0) {
                var returnAuthRecord = record.load({
                    type: record.Type.RETURN_AUTHORIZATION,
                    id: inid,
                    isDynamic: true
                });

                paymentItems.forEach(function (item) {
                    returnAuthRecord.selectNewLine({ sublistId: 'item' });
                    returnAuthRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: item.item });
                    returnAuthRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: item.quantity });
                    returnAuthRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: item.rate });
                    returnAuthRecord.commitLine({ sublistId: 'item' });
                });

                returnAuthRecord.save();
            }

            //生成贷项通知单creditmemo
            var recordObj1 =  record.transform({
                fromType: "returnauthorization",
                fromId: inid,
                toType: "creditmemo",
            });
            recordObj1.setText('trandate',date);//通过文本形式赋值
            recordObj1.setText('custbody_tkrq',null);
            recordObj1.setValue('shipmethod', SOShipMethod);// 将发运方式赋值到贷项通知单
            var inid1=recordObj1.save();
            //关闭退货授权
            var objRecord =record.load({
                type: record.Type.RETURN_AUTHORIZATION,
                id: inid,
                isDynamic: true
            });
            //取到退货授权的行数,循环赋值关闭
            var lineCount = objRecord.getLineCount('item');
            for(var i = 0; i <=lineCount-1; i++) {
                //找到行数据
                var lineNum = objRecord.selectLine({
                    sublistId: 'item',
                    line: i,
                });
                //将已关闭赋值为true
                lineNum.setCurrentSublistValue('item','isclosed',true);
                // 提交行
                lineNum.commitLine({
                    sublistId: 'item'
                });
            }
            //提交保存
            objRecord.save();
            //销售订单已生成退货授权标记
            var objRecord = record.load({
                type: record.Type.SALES_ORDER,
                id: id
            });
            objRecord.setValue('custbody99',true);
            objRecord.save();
        }catch(e){
            log.error('错误',e)
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