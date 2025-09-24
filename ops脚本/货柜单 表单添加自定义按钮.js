/*

类型
用户事件
名称
downLoad_min_ue
ID
customscript_download_min_ue
API 版本
2.0


这段代码是一个NetSuite用户事件脚本（User Event Script），主要功能是在记录加载前向表单添加自定义按钮。以下是对代码的详细解读：

1. 脚本基础信息
脚本类型：User Event Script（用户事件脚本）
版本：NetSuite 2.x
依赖模块：record, search, autoReceiptUtil, file, runtime, log, task


2. beforeLoad函数
在记录加载到用户界面前执行，主要功能：
A. 添加三个功能按钮
打印装箱单Excel按钮
ID: custpage_btn01
标签: "打印装箱单Excel"
点击时调用: printLabelsButton() 函数
打印装箱单PDF按钮
ID: custpage_btn03
标签: "打印装箱单PDF"
点击时调用: printPDFButton() 函数
打印商业发票Excel按钮
ID: custpage_btn02
标签: "打印商业发票Excel"
点击时调用: printInvoiceButton() 函数
*/


/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/search', './autoReceiptUtil', 'N/file', 'N/runtime', 'N/log', "N/task"],
    function (record, search, util, file, runtime, log, task) {
        function beforeLoad(context) {
            var t = context.newRecord,
				form = context.form;
			form.addButton({
                id: "custpage_btn01",
                label: "打印装箱单Excel",
                functionName: "printLabelsButton"
            });
            form.addButton({
                id: "custpage_btn03",
                label: "打印装箱单PDF",
                functionName: "printPDFButton"
            });
			form.addButton({
				id: "custpage_btn02",
				label: "打印商业发票Excel",
				functionName: "printInvoiceButton"
			});
			var fileObj = file.load({id: './downLoad_min_cl.js'});
			form.clientScriptFileId = fileObj.id;
        }

        return {
            beforeLoad: beforeLoad
        };
    });