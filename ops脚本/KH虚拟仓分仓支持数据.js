// 说明
// 1，赋值SO行序号程序挂载移库单用（调增调减单据挂在行上匹配用），KH增长事业部销售订单行id赋值
// 2，根据订单行调减ARTFUL海外仓库存（负库存会跳过），KH增长事业部销售订单调减ART库存
// 3，将ARTFUL海外仓可用库存更新到KH虚拟仓（调整单据：IAKH012501），KH分销ART库存虚拟调整脚本用
// 4，根据第2点进行过ARTFUL调减库存的订单行调增KH库存（第2点没执行的会跳过），KH增长事业部销售订单调增KH库存
// 5，自动移库过的订单行被更新地点后自动检查并重新修正移库，KH增长事业部销售订单更新地点后修正移库
// 6，自动移库过的订单行被关闭后自动检查并删除自动移库单据，KH事业增长部销售订单自动移库后订单关闭
// 增加AIO或地点、变动调整科目查看各流程搜索条件根据搜索控制数据即可，检查所有移库数据记录：KH增长事业部销售订单自动移库检查

/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define([
    'N/record',
    'N/search','N/runtime'], function(
    record,
    search,runtime) {

    function getInputData() {

        var inDate;//提前拿到一张SO的日期，反复编辑同一张库存调整单时赋值日期用

        //赋值行序号功能，避免调整库存时没有行序号无法将移库单挂在行上导致重复生成
        /*log.debug('当前执行：','赋值行序号功能')
        const datalist2 = [];
        var limit=4000;

        //加载搜索
        var mySearch = search.load({
            id: 'customsearch1753'
        })
        //执行搜索并将数据储存入数组
        mySearch.run().each(function (rec) {
            datalist2.push(
                {
                    soid: rec.getValue(rec.columns[0]),
                });
            return --limit>0;//映射脚本搜索最大取数限制4000
        });
        datalist2.forEach(function(component) {
            //根据内部id加载SO
            var objRecord =record.load({
                type: record.Type.SALES_ORDER,
                id: component.soid,
                isDynamic: true
            });
            if(!inDate){
                inDate = objRecord.getValue('trandate');//提前拿到一张SO的日期，反复编辑同一张库存调整单时赋值日期用
            }
            //取到SO的行数,循环赋值自定义行序号
            var lineCount = objRecord.getLineCount('item');
            for(var i = 0; i <=lineCount-1; i++) {
                //找到行数据
                var lineNum = objRecord.selectLine({
                    sublistId: 'item',
                    line: i,
                });
                //将序号赋值
                lineNum.setCurrentSublistValue('item','custcol22',i);
                // 提交行
                lineNum.commitLine({
                    sublistId: 'item'
                });
            }
            //提交保存销售订单
            objRecord.save();
        })//赋值行序号功能结束
        */


        //调减ARTFUL库存功能，定义数组
        log.debug('当前执行：','调减ARTFUL库存功能')
        const datalist0 = [];
        var limit=4000;
        //加载搜索
        var mySearch = search.load({
            id: 'customsearch1739'
        })
        //执行搜索并将数据储存入数组
        mySearch.run().each(function (rec) {
            datalist0.push(
                {
                    khzigongsi: rec.getValue(rec.columns[0]),
                    artzigongsi: rec.getValue(rec.columns[1]),
                    riqi: rec.getValue(rec.columns[2]),
                    kemu: rec.getValue(rec.columns[3]),
                    tiaozhengleibie: rec.getValue(rec.columns[4]),
                    beizhu: rec.getValue(rec.columns[5]),
                    neibuid: rec.getValue(rec.columns[6]),
                    huopinid: rec.getValue(rec.columns[7]),
                    huopinhangid: rec.getValue(rec.columns[8]),
                    tiaozhengdidian: rec.getValue(rec.columns[9]),
                    tiaozhengshuliang: rec.getValue(rec.columns[10]),
                    huopinleixing: rec.getValue(rec.columns[11]),
                });
            return --limit>0;//映射脚本搜索最大取数限制4000
        });

                        // 预先定义字段名数组
        const fieldNames = [
            'khzigongsi', 'artzigongsi', 'riqi', 'kemu', 'tiaozhengleibie',
            'beizhu', 'neibuid', 'huopinid', 'huopinhangid', 'tiaozhengdidian',
            'tiaozhengshuliang', 'huopinleixing'
        ];

            // 执行搜索
        mySearch.run().each(//mySearch.run(): 执行搜索，返回结果集  // .each(): 遍历结果集中的每条记录  
            function (rec) //回调函数，rec 是当前遍历的记录对象
            {
            if (limit-- <= 0) return false; //.each遇到false就会跳出循环

            const record = {};
            rec.columns.forEach((col, index) => 
                {
                record[fieldNames[index]] = rec.getValue(col);
            });

            datalist0.push(record);
            return limit > 0;
        });



        datalist0.forEach(function(component) {
            //创建ART公司调减单据
            var objRecord =record.create({
                type: record.Type.INVENTORY_ADJUSTMENT,
                isDynamic: true
            });
            // 设置主行数据
           if(!inDate){
                inDate = objRecord.getValue('trandate');//提前拿到一张SO的日期，反复编辑同一张库存调整单时赋值日期用
            }
            //子公司
            objRecord.setValue({
                fieldId: 'subsidiary',
                value: component.artzigongsi,
            });
            //日期
            objRecord.setValue({
                fieldId: 'trandate',
                value: new Date(component.riqi)
            });
            //科目账户
            objRecord.setValue({
                fieldId: 'account',
                value: component.kemu
            });
            //备注
            objRecord.setValue({
                fieldId: 'memo',
                value: 'KH销售订单虚拟挪库：'+component.beizhu,
            });
            //库存调整类别
            objRecord.setText({
                fieldId: 'custbody_k_to_inv',
                text: component.tiaozhengleibie
            });
            // 设置行数据
            //新建行
            objRecord.selectNewLine({
                sublistId: 'inventory'
            });
            //货品赋值，需要判断是否为Kit
            if(component.huopinleixing=='InvtPart'){
                log.debug('huopinid：',component.huopinid)
                objRecord.setCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'item',
                    value: component.huopinid,
                });

                //地点
                objRecord.setCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'location',
                    value: component.tiaozhengdidian,
                });
                log.debug("tiaozhengdidian",component.tiaozhengdidian)
                //调整数量
                log.debug('SO_id：',component.neibuid)
                objRecord.setCurrentSublistText({
                    sublistId: 'inventory',
                    fieldId: 'adjustqtyby',
                    text: component.tiaozhengshuliang,
                });
                //估计单位成本设置成0 2023.6.5号新增，联合运营SKU不应该存在成本
                objRecord.setCurrentSublistText({
                    sublistId: 'inventory',
                    fieldId: 'unitcost',
                    text: 0,
                });
                // 提交行
                objRecord.commitLine({
                    sublistId: 'inventory'
                });
                log.debug('location：',component.tiaozhengdidian)

            }//if判断货品类型后缀

            if(component.huopinleixing=='Kit'){
                //货品为Kit的话需要下钻循环获取子件进行库存调减
                var itemtypes = record.load({
                    type: record.Type.KIT_ITEM,
                    id: component.huopinid,
                    isDynamic: true
                });
                //获取kit的子件列表长度，循环取到子件和数量
                var lineCount = itemtypes.getLineCount('member');
                var zjitemid;
                var zjitemqty;
                for(var t = lineCount - 1; t >=0; t--) {
                    zjitemid=itemtypes.getSublistValue('member','item',t);
                    zjitemqty=itemtypes.getSublistValue('member','quantity',t);
                    objRecord.setCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'item',
                        value: zjitemid,
                    });
                    objRecord.setCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'location',
                        value: component.tiaozhengdidian,
                    });
                    //调整数量
                    log.debug('SO_id：',component.neibuid)
                    objRecord.setCurrentSublistText({
                        sublistId: 'inventory',
                        fieldId: 'adjustqtyby',
                        text: component.tiaozhengshuliang*zjitemqty,
                    });
                    //估计单位成本设置成0 2023.6.5号新增，联合运营SKU不应该存在成本
                    objRecord.setCurrentSublistText({
                        sublistId: 'inventory',
                        fieldId: 'unitcost',
                        text: 0,
                    });
                    // 提交行
                    objRecord.commitLine({
                        sublistId: 'inventory'
                    });
                }
            }//if判断货品类型后缀2
            try{
//                log.debug('inDate1：',inDate)
                // 提交库存调减单据
                var recordId = objRecord.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: false
                });
//                log.debug('inDate2：',inDate)

                //加载销售订单
                var soObj =record.load({
                    type: record.Type.SALES_ORDER,
                    id: component.neibuid
//                    isDynamic: true
                });
//                log.debug('inDate3：',inDate)
//                var lineNum = soObj.selectLine({
//                    sublistId: 'item',
//                    line: component.huopinhangid
//                });
//                log.debug('inDate4：',inDate)
                var lines=soObj.getLineCount('item')
                var line
                for (var i=0;i<lines;i++){
                    var lineId = soObj.getSublistValue('item','line',i)
//                    log.debug("lineId",lineId)
                    if(lineId == component.huopinhangid){
                        line = i
                        break
                    }
                }
                //销售订单货品行挂载库存调整单据
                log.debug("record",recordId)
//                log.debug("line",line)
                soObj.setSublistValue('item','custcol20',line,recordId)
//                lineNum.setCurrentSublistValue('item','custcol20',recordId);
                //销售订单货品行录入报错信息
                soObj.setSublistValue('item','custcol23',line,'自动移库成功')
//                lineNum.setCurrentSublistValue('item','custcol23','自动移库成功');
                // 提交行
//                log.debug('inDate5：',inDate)
//                lineNum.commitLine({
//                    sublistId: 'item'
//                });
//                log.debug('inDate6：',inDate)
                //提交保存销售订单
                soObj.save();
//                log.debug('inDate7：',inDate)
            }catch(e) {
//                log.debug("e.message",e.message)
                if (e.message && e.message.indexOf('记录已被更改')!==-1) {
                   record.delete({
                          type: record.Type.INVENTORY_ADJUSTMENT,
                          id: recordId,
                       });
                }else {
                    // log.debug("e.message",e.message)
                    //加载销售订单（出现报错）
//                    log.debug("message",e.message)
                    var soObj = record.load({
                        type: record.Type.SALES_ORDER,
                        id: component.neibuid
//                        isDynamic: true
                    });
                    var lines=soObj.getLineCount('item')
                    var line
                    for (var i=0;i<lines;i++){
                        var lineId = soObj.getSublistValue('item','line',i)
                        log.debug("lineId",lineId)
                        if(lineId == component.huopinhangid){
                            line = i
                            break
                        }
                    }
//                    var lineNum = soObj.selectLine({
//                        sublistId: 'item',
//                        line: component.huopinhangid
//                    });
                    //销售订单货品行录入报错信息
                    log.debug('报错：', e.message)
                    soObj.setSublistValue('item','custcol23',line,e.message)
//                    log.debug("huopinhangid",line)
//                    lineNum.setCurrentSublistValue('item', 'custcol23', e.message);
                    // 提交行
//                    lineNum.commitLine({
//                        sublistId: 'item'
//                    });
                    //提交保存销售订单
                    soObj.save();
                }
            }
        })//调减ART库存功能结束






        //反复编辑同一条库存调整单据实现ARTFUL可用库存同步到KH虚拟仓功能
        log.debug('当前执行：','反复编辑一条库存调整单据')
        const datalist = [];
        var limit=4000;
        var mySearch = search.load({
            id: 'customsearch_kh_qty'
        })
        mySearch.run().each(function (rec) {
            datalist.push(
                {
                    itemid: rec.getValue(rec.columns[0]),
                    qty: rec.getValue(rec.columns[2]),
                    ilocation: rec.getText(rec.columns[3]),
                });
            return --limit>0;//映射脚本搜索最大取数限制4000
        });
        try{

            var recordObj =record.load({
                type: record.Type.INVENTORY_ADJUSTMENT,
                id: 21312582,
                isDynamic: true
            });

            // 清除原行数据
            var lineCount = recordObj.getLineCount('inventory');
            for(var i = lineCount - 1; i >=0; i--) {
                recordObj.removeLine({
                    sublistId: "inventory",
                    line: i
                });
            }

            // 重新设置行数据
            datalist.forEach(function(component) {
                try {
                recordObj.selectNewLine({
                    sublistId: 'inventory'
                });
                recordObj.setCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'item',
                    value: component.itemid,
                });
                recordObj.setCurrentSublistText({
                    sublistId: 'inventory',
                    fieldId: 'location',
                    text: component.ilocation
                });
                recordObj.setCurrentSublistText({
                    sublistId: 'inventory',
                    fieldId: 'adjustqtyby',
                    text: component.qty,
                });
                //估计单位成本设置成0 2023.6.5号新增，联合运营SKU不应该存在成本
                recordObj.setCurrentSublistText({
                    sublistId: 'inventory',
                    fieldId: 'unitcost',
                    text: 0,
                });
                // 提交行
                recordObj.commitLine({
                    sublistId: 'inventory'
                });

                } catch (e) {
                    log.error('处理某条 inventory 行失败', {
                        itemid: component.itemid,
                        location: component.ilocation,
                        qty: component.qty,
                        error: e
                    });
                }
            })

            if(inDate){
                recordObj.setValue('trandate',inDate);
                log.debug("IAKH012501日期更改为：",inDate)
            }
            // 保存
            var recordId = recordObj.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });//反复编辑同一条库存调整单据实现ARTFUL可用库存同步到KH虚拟仓功能结束

        }catch (error) {
            log.error('Error', error);
            return;
        }
        log.debug("当前进度","反复编辑一条库存调整单据结束")



        //调增KH库存功能
        log.debug('当前执行：','调增KH库存功能')
        //定义数组
        const datalist1 = [];
        var limit=4000;
        //加载搜索
        var mySearch = search.load({
            id: 'customsearch1740'
        })
        //执行搜索并将数据储存入数组
        mySearch.run().each(function (rec) {
            datalist1.push(
                {
                    khzigongsi: rec.getValue(rec.columns[0]),
                    artzigongsi: rec.getValue(rec.columns[1]),
                    riqi: rec.getValue(rec.columns[2]),
                    kemu: rec.getValue(rec.columns[3]),
                    tiaozhengleibie: rec.getValue(rec.columns[4]),
                    beizhu: rec.getValue(rec.columns[5]),
                    neibuid: rec.getValue(rec.columns[6]),
                    huopinid: rec.getValue(rec.columns[7]),
                    huopinhangid: rec.getValue(rec.columns[8]),
                    tiaozhengdidian: rec.getValue(rec.columns[9]),
                    tiaozhengshuliang: rec.getValue(rec.columns[10]),
                    huopinleixing: rec.getValue(rec.columns[11]),
                });
            return --limit>0;//映射脚本搜索最大取数限制4000
        });
        datalist1.forEach(function(component) {
            //创建ART公司调减单据
            var objRecord =record.create({
                type: record.Type.INVENTORY_ADJUSTMENT,
                isDynamic: true
            });
            // 设置主行数据
            //子公司
            objRecord.setValue({
                fieldId: 'subsidiary',
                value: component.khzigongsi,
            });
            //日期
            objRecord.setValue({
                fieldId: 'trandate',
                value: new Date(component.riqi)
            });
            //科目账户
            objRecord.setValue({
                fieldId: 'account',
                value: component.kemu
            });
            //备注
            objRecord.setValue({
                fieldId: 'memo',
                value: 'KH销售订单虚拟挪库：'+component.beizhu,
            });
            //库存调整类别
            objRecord.setText({
                fieldId: 'custbody_k_to_inv',
                text: component.tiaozhengleibie
            });
            // 设置行数据
            //新建行
            objRecord.selectNewLine({
                sublistId: 'inventory'
            });
            //货品赋值，需要判断是否为Kit
            if(component.huopinleixing=='InvtPart'){
                objRecord.setCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'item',
                    value: component.huopinid,
                });
                //地点
                objRecord.setCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'location',
                    value: component.tiaozhengdidian,
                });
                //调整数量
                log.debug('SO_id：',component.neibuid)
                objRecord.setCurrentSublistText({
                    sublistId: 'inventory',
                    fieldId: 'adjustqtyby',
                    text: component.tiaozhengshuliang,
                });
                //估计单位成本设置成0 2023.6.5号新增，联合运营SKU不应该存在成本
                objRecord.setCurrentSublistText({
                    sublistId: 'inventory',
                    fieldId: 'unitcost',
                    text: 0,
                });
                // 提交行
                objRecord.commitLine({
                    sublistId: 'inventory'
                });
            }//if判断货品类型后缀

            if(component.huopinleixing=='Kit'){
                //货品为Kit的话需要下钻循环获取子件进行库存调减
                var itemtypes = record.load({
                    type: record.Type.KIT_ITEM,
                    id: component.huopinid,
                    isDynamic: true
                });
                //获取kit的子件列表长度，循环取到子件和数量
                var lineCount = itemtypes.getLineCount('member');
                var zjitemid;
                var zjitemqty;
                for(var t = lineCount - 1; t >=0; t--) {
                    zjitemid=itemtypes.getSublistValue('member','item',t);
                    zjitemqty=itemtypes.getSublistValue('member','quantity',t);
                    objRecord.setCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'item',
                        value: zjitemid,
                    });
                    objRecord.setCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'location',
                        value: component.tiaozhengdidian,
                    });
                    //调整数量
                    log.debug('SO_id：',component.neibuid)
                    objRecord.setCurrentSublistText({
                        sublistId: 'inventory',
                        fieldId: 'adjustqtyby',
                        text: component.tiaozhengshuliang*zjitemqty,
                    });
                    //估计单位成本设置成0 2023.6.5号新增，联合运营SKU不应该存在成本
                    objRecord.setCurrentSublistText({
                        sublistId: 'inventory',
                        fieldId: 'unitcost',
                        text: 0,
                    });
                    // 提交行
                    objRecord.commitLine({
                        sublistId: 'inventory'
                    });
                }
            }//if判断货品类型后缀2
        try{
            // 提交单据
            var recordId = objRecord.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });

            //加载销售订单
            var soObj =record.load({
                type: record.Type.SALES_ORDER,
                id: component.neibuid
//                isDynamic: true
            });
            var lines=soObj.getLineCount('item')
                var line
                for (var i=0;i<lines;i++){
                    var lineId = soObj.getSublistValue('item','line',i)
                    if(lineId == component.huopinhangid){
                        line = i
                        break
                    }
                }
//            var lineNum = soObj.selectLine({
//                sublistId: 'item',
//                line: component.huopinhangid
//            });
            //销售订单货品行挂载库存调整单据
            soObj.setSublistValue('item','custcol23',line,'自动移库调增成功');
//            lineNum.setCurrentSublistValue('item','custcol23','自动移库调增成功');


            //销售订单货品行挂载库存调整单据
            soObj.setSublistValue('item','custcol21',line,recordId);
//            lineNum.setCurrentSublistValue('item','custcol21',recordId);
            // 提交行
//            lineNum.commitLine({
//                sublistId: 'item'
//            });
            //提交保存销售订单
            soObj.save();
            }catch(e){
//                 log.debug("e.message",e.message)
                if (e.message && e.message.indexOf('记录已被更改')!==-1) {
                   record.delete({
                          type: record.Type.INVENTORY_ADJUSTMENT,
                          id: recordId,
                       });
                }else {
                    // log.debug("e.message",e.message)
                    //加载销售订单（出现报错）
//                    log.debug("message",e.message)
                    var soObj = record.load({
                        type: record.Type.SALES_ORDER,
                        id: component.neibuid
//                        isDynamic: true
                    });
                    var lines=soObj.getLineCount('item')
                    var line
                    for (var i=0;i<lines;i++){
                        var lineId = soObj.getSublistValue('item','line',i)
                        log.debug("lineId",lineId)
                        if(lineId == component.huopinhangid){
                            line = i
                            break
                        }
                    }
//                    var lineNum = soObj.selectLine({
//                        sublistId: 'item',
//                        line: component.huopinhangid
//                    });
                    //销售订单货品行录入报错信息
                    log.debug('报错：', e.message)
                    soObj.setSublistValue('item','custcol23',line,e.message)
//                    lineNum.setCurrentSublistValue('item', 'custcol23', e.message);
                    // 提交行
//                    lineNum.commitLine({
//                        sublistId: 'item'
//                    });
                    //提交保存销售订单
                    soObj.save();
                }
            }
        })//调增KH库存结束


        //自动移库过的订单行被更新地点后自动检查并重新修正移库功能
        log.debug('当前执行：','自动移库过的订单更新了行地点修正库存调整单')
        const datalist3 = [];
        var limit=4000;
        //加载搜索
        var mySearch = search.load({
            id: 'customsearch1755'
        })
        //执行搜索并将数据储存入数组
        mySearch.run().each(function (rec) {
            datalist3.push(
                {
                    artzhengquedidian: rec.getValue(rec.columns[1]),
                    khzhengquedidian: rec.getValue(rec.columns[0]),
                    artid: rec.getValue(rec.columns[2]),
                    artdidian: rec.getValue(rec.columns[3]),
                    khid: rec.getValue(rec.columns[4]),
                    khdidian: rec.getValue(rec.columns[5]),
                    soId: rec.getValue(rec.columns[6]),
                    soLineId: rec.getValue(rec.columns[7]),
                });
            return --limit>0;//映射脚本搜索最大取数限制4000
        });
        datalist3.forEach(function(component) {
            //根据内部id加载库存调整单
            //art调减单
            var recordObj =record.load({
                type: record.Type.INVENTORY_ADJUSTMENT,
                id: component.artid,
                isDynamic: true
            });
            //kh调增单
            var recordObj1 =record.load({
                type: record.Type.INVENTORY_ADJUSTMENT,
                id: component.khid,
                isDynamic: true
            });
            //调增调减单除了地点不同行数据行数是一样，只取一张单据的行数就可
            var lineCount = recordObj.getLineCount('inventory');
            for(var i = 0; i <=lineCount-1; i++) {
                //找到行数据
                var lineNum = recordObj.selectLine({
                    sublistId: 'inventory',
                    line: i,
                });
                var lineNum1 = recordObj1.selectLine({
                    sublistId: 'inventory',
                    line: i,
                });
                //将正确地点赋值
                log.debug('SOS_id',component.soId)
                lineNum.setCurrentSublistValue('inventory','location',component.artzhengquedidian);
                lineNum1.setCurrentSublistValue('inventory','location',component.khzhengquedidian);
                // 提交行
                lineNum.commitLine({
                    sublistId: 'inventory'
                });
                lineNum1.commitLine({
                    sublistId: 'inventory'
                });
            }
            //提交保存单据
            try{
                recordObj.save();
                recordObj1.save();
                //加载销售订单（成功更新地点）
                var soObj =record.load({
                    type: record.Type.SALES_ORDER,
                    id: component.soId
//                    isDynamic: true
                });

                var lines=soObj.getLineCount('item')
                var line
                for (var i=0;i<lines;i++){
                    var lineId = soObj.getSublistValue('item','line',i)
                    if(lineId == component.soLineId){
                        line = i
                        break
                    }
                }
//
//                var lineNum = soObj.selectLine({
//                    sublistId: 'item',
//                    line: component.soLineId
//                });
                //销售订单货品行录入异常信息
                soObj.setSublistValue('item','custcol23',line,'自动移库成功');
                // 提交行
//                lineNum.commitLine({
//                    sublistId: 'item'
//                });
                //提交保存销售订单
                soObj.save();
            }catch(e){
                //加载销售订单（出现报错）
                var soObj =record.load({
                    type: record.Type.SALES_ORDER,
                    id: component.soId
//                    isDynamic: true
                });
                var lines=soObj.getLineCount('item')
                var line
                for (var i=0;i<lines;i++){
                    var lineId = soObj.getSublistValue('item','line',i)
                    if(lineId == component.soLineId){
                        line = i
                        break
                    }
                }
//                var lineNum = soObj.selectLine({
//                    sublistId: 'item',
//                    line: component.soLineId
//                });
                //销售订单货品行录入异常信息
                soObj.setSublistValue('item','custcol23',line,e.message);
                // 提交行
//                lineNum.commitLine({
//                    sublistId: 'item'
//                });
                //提交保存销售订单
                soObj.save();
            }
        })//自动移库过的订单行被更新地点后自动检查并重新修正移库功能结束

        //自动移库过的订单行被关闭后自动删除移库单
        log.debug('当前执行：','自动移库过的订单行被关闭后删除移库单')
        const datalists = [];
        var limit=4000;
        //加载搜索把需要删除的数据过滤出来赋值到数组
        var mySearch = search.load({
            id: 'customsearch1770'
        })
        //执行搜索，并判断是否有，如果有的话将移库单删除
        mySearch.run().each(function (rec) {
            if(rec.getValue(rec.columns[1])){
                var objRecord1 = record.delete({
                    type: record.Type.INVENTORY_ADJUSTMENT,
                    id: rec.getValue(rec.columns[1])
                });
            }
            if(rec.getValue(rec.columns[0])){
                var objRecord1 = record.delete({
                    type: record.Type.INVENTORY_ADJUSTMENT,
                    id: rec.getValue(rec.columns[0])
                });
            }
            return --limit>0;
        });//自动移库过的订单行被关闭后自动删除移库单功能结束
        return datalists;
    }
    function reduce(context) {

    }

    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        reduce: reduce,
        summarize: summarize
    }
});

