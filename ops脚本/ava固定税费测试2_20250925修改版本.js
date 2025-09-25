/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/log', 'N/transaction','N/search','N/transaction'], function(record, log, transaction,search,transaction) {

    function beforeSubmit(context) {

        
        try{


            var newRecord = context.newRecord;

            var AIO = newRecord.getValue("custbody_aio_account")
            if(AIO!=="193"){
              var oldRecord = context.oldRecord;
              if (context.type !== 'edit')return
            }else{
              var oldRecord = newRecord;
            }

          
            var disable = newRecord.getValue("custbody_ava_disable_tax_calculation")
            if(AIO !=="159"&& AIO !=="193") return
            if(disable) return
          
            // 获取新的和旧的地址
            var newShipstate = newRecord.getValue("Shipstate")
//        var newphone = newRecord.getValue("shipphone")
            var newZIP = newRecord.getValue("shipzip")
            var oldShipstate = oldRecord.getValue("Shipstate")
//        var oldphone = oldRecord.getValue("shipphone")
            var oldZIP = oldRecord.getValue("shipzip")
            //特殊触发条件
            var newMemo = newRecord.getValue("custbody139")
            var oldMemo = oldRecord.getValue("custbody139")
            // log.debug("oldMemo",oldMemo)
            // log.debug("newMemo",newMemo)
            

            var count = newRecord.getLineCount('item');
            var oldcount = oldRecord.getLineCount('item')
            var isPaymentItem = false

            if(oldcount<count){
                var itemType = newRecord.getSublistValue('item','itemtype',count-1)

                if(itemType == "Payment"){
                    isPaymentItem = true
                }
            }
            //更改州、邮编、电话订单
//        log.debug("newphone",newphone)
//        log.debug("oldphone",oldphone)
//        log.debug("equal",newphone==oldphone)
            if (newShipstate != oldShipstate || newZIP != oldZIP) {
                setTax(oldRecord,newRecord)
              log.debug("地址变更开始计算税率AIO:",AIO)
            }

            if (newMemo != oldMemo && newMemo == "固定税码"){
                setTax(oldRecord,newRecord)
                log.debug("已根据备注重新生成税码","已根据备注重新生成税码")
            }
            

            //店铺信用抵扣订单2025/9/25 改成订单创建时就计算固定税率，这样的话后续店铺信用就能正常推送
            if (context.type === 'create') {
                var storeCredit = newRecord.getValue("custbody_store_credit");
                if (storeCredit > 0) {
                    setTax(oldRecord, newRecord);
                    log.debug("创建时店铺信用大于0开始计算税率", "创建时店铺信用大于0开始计算税率");
                }
            }

          if(AIO =='193'){
             log.debug("zg线下店铺","1")
             setTax(oldRecord,newRecord)

          }
        }catch(e){
            log.error("message",e)
        }
    }

    function setTax(oldRecord,newRecord){
        log.debug("oldRecord",oldRecord)
        log.debug("newRecord",newRecord)
        try{
            var itemTaxId
            var oldTax = oldRecord.getValue('taxamountoverride')
            newRecord.setValue({
                fieldId: 'taxamountoverride',
                value: null // 或者使用 null 来清除该字段
            });
            var count=newRecord.getLineCount('item');
            var oldcount=oldRecord.getLineCount('item');
            var itemTax_t = oldRecord.getValue("custbody116")-oldRecord.getValue("custbody121")
            var shipTax_t = oldRecord.getValue("custbody121")
//            log.debug("oldcount",oldcount)
//            log.debug("newRecord",count)
            var subtotal = oldRecord.getValue("subtotal")
            var discount = oldRecord.getValue("discounttotal")
            var total = subtotal+discount
            for(var t=0;t<oldcount;t++){
//                log.debug("t",t)
                var itemType = oldRecord.getSublistValue('item','itemtype',t)
                if(itemType == "Payment"){
                    total -= oldRecord.getSublistValue('item','amount',t)
                }
            }

            var itemtaxRate = itemTax_t/total*100
            if(itemtaxRate == "0" || itemType == "Payment"){
                itemTaxId = -7
            }else{

                search.create({
                    type: "salestaxitem",
                    filters:
                        [
                            ["name","is",itemtaxRate]
                        ],
                    columns:
                        [
                            search.createColumn({name: "internalid", label: "内部 ID"})
                        ]
                }).run().each(function(result) {

                    itemTaxId = result.id;
                    log.debug("税码",itemTaxId);

                })
            }
            if(!itemTaxId){
                var customRecord = record.create({
                    type: record.Type.SALES_TAX_ITEM,
                    defaultValues:{
                        nexuscountry:'US'
                    },
                    isDynamic: true,
                });
                customRecord.setValue('itemid',itemtaxRate);//税名
                customRecord.setValue('rate',itemtaxRate);//税率
                customRecord.setValue('subsidiary',49);//子公司
                customRecord.setValue('taxagency',24395125);//税务代理
                customRecord.setValue('taxaccount',209);//纳税科目
                customRecord.setText('description',"商品税用，销售订单："+newRecord.getValue('otherrefnum'));//说明
                itemTaxId = customRecord.save();
            }
            for(var y=0;y<count;y++){
                var itemType = newRecord.getSublistValue('item','itemtype',y)
                if(itemType == "Payment"){
                    newRecord.setSublistValue('item','taxcode',y,-7);
                }else{
                    newRecord.setSublistValue('item','taxcode',y,itemTaxId);
                }
            }


            var shipTaxId
            var shippingcost = oldRecord.getValue('shippingcost');


            if(shippingcost != 0||shipTax_t != 0){
                var shippingTax = shipTax_t/shippingcost*100
                search.create({
                    type: "salestaxitem",
                    filters:
                        [
                            ["name","is",shippingTax]
                        ],
                    columns:
                        [
                            search.createColumn({name: "internalid", label: "内部 ID"})
                        ]
                }).run().each(function(result) {

                    shipTaxId = result.id;

                })
                if(!shipTaxId){
                    var salesTaxItem = record.create({
                        type: record.Type.SALES_TAX_ITEM,
                        defaultValues:{
                            nexuscountry:'US'
                        },
                        isDynamic: true,
                    });
                    salesTaxItem.setValue('itemid',shippingTax);//税名
                    salesTaxItem.setValue('rate',shippingTax);//税率
                    salesTaxItem.setValue('subsidiary',49);//子公司
                    salesTaxItem.setValue('taxagency',24395125);//税务代理
                    salesTaxItem.setValue('taxaccount',209);//纳税科目
                    salesTaxItem.setText('description',"运费税用，销售订单："+newRecord.getValue('otherrefnum'));//说明
                    shipTaxId = salesTaxItem.save();
                }
                newRecord.setValue('shippingtaxcode',shipTaxId);
            }else{
                shipTaxId = -7
                log.debug("shiptax",shipTaxId)
                newRecord.setValue('shippingtaxcode',shipTaxId);
            }

            // newRecord.setValue('custbody_ava_disable_tax_calculation',"T");
        }catch(e){
            log.debug("message",e)
        }
    }



    return {
        beforeSubmit: beforeSubmit
    };
});