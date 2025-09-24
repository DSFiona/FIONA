/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
define(["N/record", "N/search", "N/log"],
    function(record, search, log) {
        function onAction(scriptContext) {
        try{
            log.debug({
                title: 'Start Script'
            });
            var newRecord = scriptContext.newRecord;
            var recordId = newRecord.id;
            var AIO = newRecord.getValue('custbody_aio_account')
            log.debug("recordId: ", recordId);
            var itemCount = newRecord.getLineCount({
                                sublistId: 'item'
                                });
            log.debug({
                title: 'Item Count',
                details: itemCount
            });
            var totalWeightList = []
            var string_list = "list:"
            for(var i = 0; i < itemCount; i++)
            {
                var quantity = newRecord.getSublistValue('item','quantity',i);
                var location = newRecord.getSublistText('item','inventorylocation',i);
                if(!location){
                    continue;}
                var sku = newRecord.getSublistValue('item','item',i);
                var type = newRecord.getSublistValue('item','itemtype',i);
                var long160 = 0
                var long163 = 0
                var long155 = 0
                var short155 = 0
                if(type == 'Kit'){
                    var kitItem = record.load({type: record.Type.KIT_ITEM, id: sku});
                    var member_count = kitItem.getLineCount("member");
                    var weight = 0
                    for (var j = 0; j < member_count; j++) {
                        var item_id = kitItem.getSublistValue("member", "item", j);
                        log.debug("item_id: ", item_id+"-行："+j+"i:"+i);
                        var item_qty = Number(kitItem.getSublistValue("member", "quantity", j));
                        var item = record.load({type: record.Type.INVENTORY_ITEM, id: item_id})

                        var item_long = item.getValue('custitem_k_long');
                        var item_wide = item.getValue('custitem_k_wide');
                        var item_height = item.getValue('custitem_k_high');
                        item_long = Number(item_long);
                        item_wide = Number(item_wide);
                        item_height = Number(item_height);
                        var dimensions = [item_long, item_wide, item_height].sort(function(a, b) {
                            return b - a; // 降序排列
                        });
                        log.debug("dimensions: ", dimensions);

                        var Girth = 2*(dimensions[2] + dimensions[1]) + dimensions[0];//围长
                        log.debug("Girth: ", Girth);
                        if(Girth > 164){//包裹围长大于164 需要发ltl
                            string_list = string_list+","+location + ","
                            long155++
                            short155++
                            long160++
                            long163++
                        }else if(Girth > 163){
                            long163++
                            long160++
                            long155++
                            short155++
                        }else if(Girth > 160){
                            long160++
                            long155++
                            short155++
                        }else if(Girth >= 155){
                            long155++
                            short155++
                        }else{
                            short155++
                        }
                        var logi_weight = item.getValue('custitem_k_gw_1ibs');
                        //20250915修改shopify ltl规则
                        //20250919修改shopify ltl规则从重量145改为148
                        if(AIO == '16'&&logi_weight >= 148){
                            string_list = string_list+","+location + ","
                        }
                        weight = weight + (item.getValue('custitem_k_gw_1ibs'))*item_qty;
                        log.debug("KIT_weight: ", weight);
                    }
                }else{
                    var item = record.load({type: record.Type.INVENTORY_ITEM, id: sku})
                    var weight = item.getValue('custitem_k_gw_1ibs');
                    var item_long = item.getValue('custitem_k_long');
                    var item_wide = item.getValue('custitem_k_wide');
                    var item_height = item.getValue('custitem_k_high');
                    var dimensions = [item_long, item_wide, item_height].sort(function(a, b) {
                        return b - a; // 降序排列
                    });

                    var Girth = 2*(dimensions[2] + dimensions[1]) + dimensions[0];//围长
//                    log.debug("Girth: ", Girth);
                    if(Girth > 164){//包裹围长大于164 需要发ltl
                        string_list = string_list+","+location + ","
                        long155++
                        short155++
                        long160++
                        long163++
                    }else if(Girth > 163){
                        long163++
                        long160++
                        long155++
                        short155++
                    }else if(Girth > 160){
                        long160++
                        long155++
                        short155++
                    }else if(Girth >= 155){
                        long155++
                        short155++
                    }else{
                        short155++
                    }
                    log.debug("Girth: ", Girth);
                    log.debug("ITEM_weight: ", weight);
                    //20250915修改shopify ltl规则
                    //20250919修改shopify ltl规则从重量145改为148
                    if(AIO == '16'&&weight >= 148){
                        string_list = string_list+","+location + ","
                    }
                }


                //20250915修改shopify ltl规则
                if(AIO == '16'&&dimensions[0] >= 106){
                    string_list = string_list+","+location + ","
                }


                var list = {
                    'location': location,
                    'weight': weight*quantity,
                    'long160': long160,
                    'long155': long155,
                    'short155': short155,
                    'long163': long163
                }

                var g
                const found2 = totalWeightList.some(function(r,index){g = index; return r.location === location});
                if(found2){
                    totalWeightList[g].weight += weight*quantity;
                    totalWeightList[g].long160 += long160
                    totalWeightList[g].long163 += long163
                    totalWeightList[g].long155 += long155
                    totalWeightList[g].short155 += short155
                }else{
                    totalWeightList.push(list);
                }
            }

            var ltl_location=[]



            for(var i = 0; i < totalWeightList.length; i++){
                var location = totalWeightList[i].location;
                var weight = totalWeightList[i].weight;
                if(AIO == '16'){
                    var long163 = totalWeightList[i].long163;
                    var long155 = totalWeightList[i].long155;
                    var short155 = totalWeightList[i].short155;
                    if(long163 > 0){
                        string_list = string_list+","+location + ","
                    }else if(long155 >= 2 || weight >= 500){
                        string_list = string_list+","+location + ","
                    }else if(short155 >= 6 || weight >= 500){
                        string_list = string_list+","+location + ","
                    }
                }else{
                    if(weight > 500){//同仓库重量大于500 需要发ltl
                        string_list = string_list+","+location + ","
                    }
                }
            }

//             newRecord.setValue({
//                fieldId: "custwfstate1", // 你的工作流字段 ID
//                value: "string_list" // 你想设置的值
//             });
             log.debug("string_list: ", string_list);

            return string_list;
            }catch(e){
                log.error("error",e)
            return "error"
            }
        }
        return {
            onAction: onAction
        }
    });