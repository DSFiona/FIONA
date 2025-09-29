/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 * 根据搜索生成客户存款
 */
/*
* 搜索：待生成客户存款列表
* 触发条件：销售订单字段：预收款日期、商品预收款金额、运费预收款金额、已生成客户存款。
* 使用方法：有一个工作流（SO_预收款赋值），在订单创建时会自动计算出上面几个字段，然后此脚本根据字段信息定时执行生成客户存款。
* 也可以进行手动导入，以此来人为生成客户存款。
* 脚本基本逻辑：根据搜索拿到信息，分别生成商品和运费的2笔客户存款，给上特殊备注，关联到销售订单下。
* Tips：
* 1、订单开票后，发票将会自动核销到最早生成的客户存款下，所以在脚本中需要优先生成运费存款；
* 2、使用按行退款脚本可对客户存款进行批量退款；
* 3、客户存款-存款核销-发票，三张单据进行连结核销，如果删除存款核销，编辑保存一下发票就可以生成新的核销单。
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
            id:"customsearch2402"
        })
        mySearch.run().each(function (rec) {
            datalist.push(
                {
                    id: rec.getValue(rec.columns[0]),
                    kehu: rec.getValue(rec.columns[1]),
                    zigongsi: rec.getValue(rec.columns[2]),
                    Productamount: rec.getValue(rec.columns[3]),
                    trandate: rec.getValue(rec.columns[4]),
                    Marketplace: rec.getValue(rec.columns[5]),
                    AIOAccount: rec.getValue(rec.columns[6]),
                    Freightamount: rec.getValue(rec.columns[7]),
                    POid: rec.getValue(rec.columns[9]),
                });
            return --limit>0;//映射脚本搜索最大取数限制4000
            return true;
        });
        return datalist;

    }

    function reduce(context) {
        try {
            const obj = JSON.parse(context.values[0]);
            const id = obj.id;
            const kehu = obj.kehu;
            const zigongsi = obj.zigongsi;
            // const Productamount = obj.Productamount;
            const trandate = obj.trandate;
            const Marketplace = obj.Marketplace;
            const AIOAccount = obj.AIOAccount;
            // const Freightamount = obj.Freightamount;
            var Productamount = Number(obj.Productamount);  // 转换为数字
            var Freightamount = Number(obj.Freightamount);  // 转换为数字
            const POid = obj.POid;

            // 规范日期格式
            var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
            var date = moment(trandate, 'M/D/YYYY').format(dateFormat);

            // 搜索店铺列表，获取付款方式
            var accountSearch = search.create({
                type: "customrecord_aio_account",
                filters: [
                    ["internalid", "is", AIOAccount.toString()]
                ],
                columns: ['custrecord_aio_salesorder_payment_method']
            });

            var paymentMethodId;
            accountSearch.run().each(function (result) {
                paymentMethodId = result.getValue("custrecord_aio_salesorder_payment_method");
                return false; // 获取第一个结果
            });

            var freightDepositId = null;
            var productDepositId = null;

            // 如果Productamount小于0，则将Freightamount设为Productamount + Freightamount，并跳过生成商品预收款
            if (Productamount && Productamount < 0) {
                // log.debug("Productamount小于0", Productamount);
                Productamount = Number(Freightamount) + Number(Productamount);
                Freightamount = 0; // 不生成运费预收款
            }
            // 如果订单总金额为0，不用生成存款，标记订单后退出
            if (Productamount == 0 && Freightamount == 0) {
                log.debug("订单总金额为0，标记订单", POid);
                var salesOrder = record.load({
                    type: record.Type.SALES_ORDER,
                    id: id
                });
                salesOrder.setValue({
                    fieldId: 'custbody131',
                    value: true
                });
                salesOrder.save();
                return
            }

            // 优先生成运费预收款
            if (Freightamount && !isNaN(Freightamount) && Number(Freightamount) > 0) {
                // log.debug("执行一", Freightamount);
                var recordObj = record.create({
                    type: record.Type.CUSTOMER_DEPOSIT,
                    isDynamic: true
                });
                recordObj.setValue('customer', kehu);
                recordObj.setValue('subsidiary', zigongsi);
                recordObj.setValue('salesorder', id);
                recordObj.setValue('payment', Number(Freightamount)); // 确保Freightamount是数值
                recordObj.setValue('memo', '运费预收款' + POid);
                recordObj.setText('trandate', date); // 设置日期
                recordObj.setValue('custbody_aio_marketplaceid', Marketplace);
                recordObj.setValue('custbody_aio_account', AIOAccount);
                recordObj.setValue('paymentoption', paymentMethodId); // 设置付款方式
                freightDepositId = recordObj.save();
            }

            // 生成商品预收款
            if (Productamount && !isNaN(Productamount) && Number(Productamount) > 0) {
                // log.debug("执行二", Productamount);
                var productRecordObj = record.create({
                    type: record.Type.CUSTOMER_DEPOSIT,
                    isDynamic: true
                });
                productRecordObj.setValue('customer', kehu);
                productRecordObj.setValue('subsidiary', zigongsi);
                productRecordObj.setValue('salesorder', id);
                productRecordObj.setValue('payment', Number(Productamount)); // 确保Productamount是数值
                productRecordObj.setText('trandate', date); // 设置日期
                productRecordObj.setValue('custbody_aio_marketplaceid', Marketplace);
                productRecordObj.setValue('custbody_aio_account', AIOAccount);
                productRecordObj.setValue('paymentoption', paymentMethodId); // 设置付款方式
                productRecordObj.setValue('memo', '商品预收款' + POid);
                productDepositId = productRecordObj.save();
            }

            // 更新销售订单中的“已生成客户存款”为true
            if (freightDepositId || productDepositId) {
                var salesOrder = record.load({
                    type: record.Type.SALES_ORDER,
                    id: id
                });

                salesOrder.setValue({
                    fieldId: 'custbody131',
                    value: true
                });
                log.debug("已成功生成客户存款，订单编号：", POid);
                salesOrder.save();
            }

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