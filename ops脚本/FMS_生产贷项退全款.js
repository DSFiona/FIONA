/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define([ 'N/record','N/log', 'N/runtime','./moment'], 
function(record,log,runtime,moment ) {
    function post(param) {
         try{
           //log.debug('context', JSON.stringify(context))
           //const obj = JSON.parse(context.values[0]);
		   //订单NSID
           const id = param.nsOrderId;
		   //交易日期
           const trandate = param.trandate;
			
           //生成退货授权returnauthorization  来源销售订单
           var recordObj =  record.transform({
                        fromType: "salesorder",
                        fromId: id,
                        toType: "returnauthorization",
						isDynamic: true //开启动态模式
                    });
           var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
           var date = moment(trandate, 'M/D/YYYY').format(dateFormat);
           recordObj.setText('trandate',date);//通过文本形式赋值
		  //迭代订单行，因为退款要指定SKu退款
			var lineCount0 = recordObj.getLineCount('item');
			log.debug('lineCount0', lineCount0);
			//for(var i = 0; i <=lineCount0-1; i++) {
			for (var i = lineCount0 - 1; i >= 0; i--) {  // 逆序遍历，防止索引错乱
				
				//找到行数据
				var lineNum = recordObj.selectLine({
					sublistId: 'item',
					line: i,
				});
				//单价
				lineNum.setCurrentSublistValue("item","rate",取原订单行值);
				//数量	
				lineNum.setCurrentSublistValue("item","quantity",取原订单行值);
				//总价
				lineNum.setCurrentSublistValue("item","amount",取原订单行值);
				lineNum.commitLine({
					sublistId: 'item'
				});
			}
			//保存退货授权
           var inid=recordObj.save();
           //	log.debug('inid', JSON.stringify(inid));		
           //生成贷项通知单creditmemo
            var recordObj1 =  record.transform({
                        fromType: "returnauthorization",
                        fromId: inid,
                        toType: "creditmemo",
                    });
           recordObj1.setText('trandate',date);//通过文本形式赋值
           recordObj1.setText('custbody_tkrq',null);
          // recordObj1.setValue('shipmethod', SOShipMethod);// 将发运方式赋值到贷项通知单
		  // 贷项通知单ID，生成客户退款单要使用
		  //这里同时提交掉需要退的运费
			//贷项通知单提交保存
           var inid1=recordObj1.save();
		   
		   //log.debug('inid1', JSON.stringify(inid1));	
           //关闭退货授权
           var objRecord =record.load({
            type: record.Type.RETURN_AUTHORIZATION,
            id: inid,
            isDynamic: true
			});
			//log.debug('objRecord-2', JSON.stringify(objRecord));			
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
			objRecord.save();
			
			
			//销售订单已生成退货授权标记
			var objRecord = record.load({
				type: record.Type.SALES_ORDER,
				id: id
			});
			objRecord.setValue('custbody99',true);
	
			
			objRecord.save();
			return inid1;
		
       }catch(e){
            log.error('错误',e)
       }
    }
     return {
         post: post
     };
});