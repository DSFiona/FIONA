var salesorderSearchObj = search.create({
   type: "salesorder",
   settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
   filters:
   [
      ["type","anyof","SalesOrd"], //类型 是 销售订单
      "AND", 
      ["custbody_tkrq","isnotempty",""], //客户退款日期 (自定义 主体)非空
      "AND", 
      ["custbody99","is","F"], // 已生成授权退货/贷项通知单 (自定义 主体) 是错的
      "AND", 
      ["mainline","is","T"], //主行 对
      "AND", 
      [["status","noneof","SalesOrd:A","SalesOrd:C","SalesOrd:H"], //状态 非 销售订单:待审批, 销售订单:已取消, 销售订单:已关闭
      "OR",[["status","anyof","SalesOrd:H"], "AND",["custbody_aio_account","anyof","159","162"]]], // 等于为任意 US-Z Gallerie-ZG, US-Z Gallerie-ZG-KH 销售订单:已关闭
      "AND", 
      ["custbody_k_so_return","anyof","@NONE@"], // 是否退货 (自定义 主体) 等于 无
      "AND", 
      ["custbody_invoice_charge_off","is","F"] //发票对应冲销 (自定义 主体) 是错的
   ],
   columns:
   [
      search.createColumn({name: "internalid", label: "内部 ID"}),
      search.createColumn({name: "custbody_tkrq", label: "客户退款日期"}),
      search.createColumn({name: "otherrefnum", label: "采购订单/支票号码"}),
      search.createColumn({name: "custbody_aio_marketplaceid", label: "Marketplace"}),
      search.createColumn({name: "custbody_aio_account", label: "AIO Account"}),
      search.createColumn({name: "statusref", label: "状态"})
   ]
});
var searchResultCount = salesorderSearchObj.runPaged().count;
log.debug("salesorderSearchObj result count",searchResultCount);
salesorderSearchObj.run().each(function(result){
   // .run().each has a limit of 4,000 results
   return true;
});

/*
salesorderSearchObj.id="customsearch1758603499405";
salesorderSearchObj.title="待生成退货授权/贷项通知单列表 (copy)";
var newSearchId = salesorderSearchObj.save();
*/