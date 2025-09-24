/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript

 
类型 用户事件
名称 autoTransactionUE
ID customscript_autotransactionue
API 版本 2.0
 */


/*
1. 脚本基础信息
脚本类型：User Event Script（用户事件脚本）
版本：NetSuite 2.x
依赖模块：record, search, autoReceiptUtil, file, runtime, log, task

2. 主要功能
beforeSubmit函数
在记录提交前执行，主要功能：

A. 创建时（CREATE）
计算"recmachcustrecord_k_link"子列表中所有行的"custrecord_k_number"字段值的总和
将总和向上取整后设置到"custrecord_total_quantity"字段

B. 编辑时（EDIT）
仓库逻辑处理：
检查是否入库但未设置仓库字段
如果是，将入库地点值设置到所有子列表行的"custrecord_k_overseas"字段
位置完整性检查：
检查所有子列表行是否都设置了"custrecord_k_transfer"和"custrecord_k_overseas"字段
设置"custrecord_k_location_all"字段标识是否所有位置信息都已填写

afterSubmit函数
在记录提交后执行，主要处理状态变更触发的自动化流程：

A. 状态变更检测
只在编辑操作且非计划任务环境下执行
检查状态从"7"→"11"（采购单收货）、"11"→"2"（生成TO单）、"11"→"9"或"2"→"9"（开票）

B. 数据处理
收集集装箱清单的详细信息：
子列表项数据（物品、编号、采购单行号、数量、转移地点、海外仓库、国家）
主记录数据（提单号、公司、箱号、名称、国内入库地点、装货日期、价格等）

C. 任务创建
查找自动收货/账单脚本
创建动态脚本部署记录
设置任务参数：
交易类型（收货/开票）
交易记录ID
交易数据（JSON格式）
提交计划任务执行
更新记录标记为"执行中"

3. 业务逻辑分析
这是一个集装箱管理自动化系统，主要处理：
数量统计：自动计算集装箱内物品总数
仓库分配：确保入库时有正确的仓库信息

状态驱动流程：
状态7→11：触发采购收货
状态11→2：生成转移订单
状态11→9或2→9：触发开票流程

*/


 
define(['N/record', 'N/search', './autoReceiptUtil', 'N/file', 'N/runtime', 'N/log', "N/task"],
    function (record, search, util, file, runtime, log, task) {

        function beforeSubmit(context) {
            var newRec = context.newRecord;
            try {
                if (context.type == context.UserEventType.CREATE) {
                    /*lucah 2021/4/13 增加*/
                    var totalNum = 0;
                    var linecount_all = newRec.getLineCount("recmachcustrecord_k_link");
                    for (var i = 0; i < linecount_all; i++) {
                        totalNum += Number(newRec.getSublistValue('recmachcustrecord_k_link', 'custrecord_k_number', i));
                    }
                    newRec.setValue("custrecord_total_quantity", Math.ceil(totalNum));
                }
                if (context.type != context.UserEventType.EDIT) return;

                var k_warehous_or_not = newRec.getValue("custrecord_k_warehous_or_not");
                var k_invoice_or_not = newRec.getValue("custrecord_k_invoice_or_not");
                var custrecord_k_ruku = newRec.getValue("custrecord_k_ruku");
                //不判断是否开票字段值
                if (custrecord_k_ruku && !k_warehous_or_not) {
                    //新增行上海外仓库
                    var linecount_all = newRec.getLineCount("recmachcustrecord_k_link");
                    for (var i = 0; i < linecount_all; i++) {
                        newRec.setSublistValue('recmachcustrecord_k_link', 'custrecord_k_overseas', i, custrecord_k_ruku);
                    }
                }

                var flag = true;
                var linecount_all = newRec.getLineCount("recmachcustrecord_k_link");
                for (var i = 0; i < linecount_all; i++) {
                    var k_transfer = newRec.getSublistValue('recmachcustrecord_k_link', 'custrecord_k_transfer', i);
                    var k_overseas = newRec.getSublistValue('recmachcustrecord_k_link', 'custrecord_k_overseas', i);
                    if (!k_transfer || !k_overseas) {
                        flag = false;
                        break;
                    }
                }
                newRec.setValue("custrecord_k_location_all", flag);
            } catch (e) {
                log.error("异常", JSON.stringify(e));
            }
        }

        function afterSubmit(context) {
            var newRec = context.newRecord;
            var oldRec = context.oldRecord;
            var k_in_execution = newRec.getValue("custrecord_k_in_execution");
            if (context.type == context.UserEventType.EDIT && runtime.executionContext !== runtime.ContextType.SCHEDULED && !k_in_execution) {
                var k_status = newRec.getValue("custrecord_k_status");
                var k_old_status = oldRec.getValue("custrecord_k_status");
                //log.debug(k_old_status, k_status)
                //type=11，采购单收货；type=1,生成to单；type=2，开票
                var type = "0";
                if (k_old_status == "7" && k_status == "11") {
                    type = '11'
                }
                if (k_old_status == "11" && k_status == "2") {
                    type = '1';
                }
                if (k_old_status == "11" && k_status == "9") {
                    type = '2';
                }
                if (k_old_status == "2" && k_status == "9") {
                    type = '2';
                }
                if (type=='0') return;

                try {
                    var internalId = newRec.id;
                    var paymentRequest = {};
                    var itemRequest = [];
                    var linecount = newRec.getLineCount("recmachcustrecord_k_link");
                    for (var i = 0; i < linecount; i++) {
                        var k_item = newRec.getSublistValue('recmachcustrecord_k_link', 'custrecord_k_item', i)
                        var k_no = newRec.getSublistValue('recmachcustrecord_k_link', 'custrecord_k_no', i)
                        var k_po_numberline = newRec.getSublistValue('recmachcustrecord_k_link', 'custrecord_k_po_numberline', i)
                        var k_number = newRec.getSublistValue('recmachcustrecord_k_link', 'custrecord_k_number', i)
                        var k_transfer = newRec.getSublistValue('recmachcustrecord_k_link', 'custrecord_k_transfer', i)
                        var k_overseas = newRec.getSublistValue('recmachcustrecord_k_link', 'custrecord_k_overseas', i)
                       var k_country = newRec.getSublistValue('recmachcustrecord_k_link', 'custrecord1466', i)//国家
                        itemRequest.push({
                            k_item: k_item,
                            k_no: k_no,
                            k_po_numberline: k_po_numberline,
                            k_number: k_number,
                            k_transfer: k_transfer,
                            k_overseas: k_overseas,
                          k_country: k_country
                        })
                    }
                    paymentRequest.custrecord_k_bl = newRec.getValue("custrecord_k_bl");
                    paymentRequest.custrecord_k_company = newRec.getValue("custrecord_k_company");
                    paymentRequest.custrecord_k_case_number = newRec.getValue("custrecord_k_case_number");
                    paymentRequest.containername = newRec.getValue("name");
                    paymentRequest.rcvLocation = oldRec.getValue("custrecord_k_cnruku");//国内入库地点
                    paymentRequest.trandate = oldRec.getText("custrecord_k_shipment_date");//装货日期
                    paymentRequest.custrecord_k_pricetwo = newRec.getValue("custrecord1470");
                    paymentRequest.itemRequest = itemRequest;
                    log.debug(internalId + "paymentRequest", JSON.stringify(paymentRequest));
                    var scriptId;
                    search.create({
                        type: "script",
                        filters: [["scriptid", "is", "customscript_autoreceiptbillshd"]]
                    }).run().each(function (result) {
                        scriptId = result.id;
                    });
                    if (!scriptId) {
                        log.error(internalId, "脚本：自动收货/账单 不存在！");
                        return;
                    }
                    var rec = record.create({
                        type: record.Type.SCRIPT_DEPLOYMENT,
                        defaultValues: {
                            script: scriptId//TODO
                        },
                        isDynamic: true
                    });
                    var mill = new Date().getTime();
                    rec.setValue('startdate', new Date());
                    rec.setValue('scriptid', '_label_auto_' + mill);
                    rec.setValue('title', 'autoReceiptBillShd');
                    rec.setValue('custscript_ment_transaction_type', type);
                    rec.setValue('custscript_ment_transaction_internalid', internalId + '');
                    rec.setValue('custscript_ment_transaction_data', JSON.stringify(paymentRequest));
                    rec.setValue('priority', 1);
                    var recId2 = rec.save();
                    var mrTask1 = task.create({
                        taskType: task.TaskType.SCHEDULED_SCRIPT,
                        scriptId: "customscript_autoreceiptbillshd",
                        deploymentId: 'customdeploy_label_auto_' + mill
                    });
                    var mrTaskId1 = mrTask1.submit();
                    // log.debug("mill",internalId+"--"+mill);
                    log.debug(internalId + "创建任务", "ID: " + 'customdeploy_label_auto_' + mill);

                    record.submitFields({
                        type: "customrecord_k_container_list",
                        id: internalId,
                        values: {custrecord_k_in_execution: true},
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true  //忽略强制字段
                        }
                    })
                } catch (e) {
                    log.error("自动入库开账单异常", e.message + "," + e.stack);
                }
            }
        }

        return {
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    });