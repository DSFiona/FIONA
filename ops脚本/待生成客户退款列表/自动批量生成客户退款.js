/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 1，根据列表：待生成客户退款列表
2，从贷项通知单上判断“客户退款日期”字段是否非空来生成客户退款
 */
define([
    'N/record',
    'N/search','N/runtime','./moment'
], function(
    record,
    search,runtime,moment
    ) {
 
    // 获取输入数据函数，用于从搜索结果中提取待生成客户退款的数据
    function getInputData() {
       const datalist = [];
      var limit=4000;
       var mySearch = search.load({
            id:"customsearch1936"  
        })
        mySearch.run().each(function (rec) {
                datalist.push(
                    {
                        id: rec.getValue(rec.columns[0]),
                        trandate: rec.getValue(rec.columns[1]),
                        kehu: rec.getValue(rec.columns[2]),
                        zigongsi:rec.getValue(rec.columns[3]),
                    });
          return --limit>0;//映射脚本搜索最大取数限制4000
                return true;
            });
            return datalist;
 
    }
 
    // reduce 函数，用于处理每个搜索结果并生成客户退款记录
    function reduce(context) {
         try{
           //log.debug('context', JSON.stringify(context))
           const obj = JSON.parse(context.values[0]);
           const id = obj.id;
           const trandate = obj.trandate;
           const kehu = obj.kehu;
           const zigongsi = obj.zigongsi;
           //生成客户退款customerrefund
           var recordObj =  record.create({
                    type: record.Type.CUSTOMER_REFUND,
                    isDynamic: true
                     });
            recordObj.setValue('customer',kehu);
            recordObj.setValue('subsidiary',zigongsi);
           var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
           //var date=moment.utc(trandate,dateFormat).format(dateFormat);
           var date = moment(trandate, 'M/D/YYYY').format(dateFormat);
           //var date = moment(trandate, 'YYYY-MM-DD').format(dateFormat);
           recordObj.setText('trandate',date);//通过文本形式赋值
           //行
           // 查询行
        var lineCount = recordObj.getLineCount('apply');
        log.debug('行数:', lineCount);
        for(var i = lineCount - 1; i >=0; i--) {
            if(recordObj.getSublistValue('apply','internalid',i)===id){
              var itemRecord = recordObj.selectLine({
                        sublistId: 'apply',
                        line: i
                    });
               itemRecord.setCurrentSublistValue({
                            sublistId: 'apply',
                            fieldId: 'apply',
                            value: true
                        });
              itemRecord.commitLine({
                        sublistId: "apply"
                    });
            }
        }		           
            
           var inid=recordObj.save();
            
        }catch(e){
            log.error('错误',e)
        }
    }
 
    // summarize 函数，用于在 map-reduce 脚本完成后执行总结操作（目前未实现具体功能）
    function summarize(summary) {
         
    }
 
    return {
        getInputData: getInputData,
        reduce: reduce,
        summarize: summarize
    }
});