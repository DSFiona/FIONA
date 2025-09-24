// 增长事业部&增长自采订单拆单-程序用


var salesorderSearchObj = search.create({
   type: "salesorder",
   settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
   filters:
   [
      ["type","anyof","SalesOrd"], 
      "AND", 
      ["mainline","is","F"], 
      "AND", 
      ["cogs","is","F"], //销货成本行
      "AND", 
      ["shipping","is","F"], //发运行
      "AND", 
      ["taxline","is","F"], //税行
      "AND", 
      ["intercotransaction","anyof","@NONE@"], //配对的公司间事务处理
      "AND", 
      ["item.custitem_k_agent_operation","anyof","6"], //货品 : 代运营 (自定义)
      "AND", 
      ["status","anyof","SalesOrd:B","SalesOrd:D","SalesOrd:E"] //为任意 销售订单:待履行, 销售订单:部分履行, 销售订单:待开票/部分履行
   ],
   columns:
   [
      search.createColumn({name: "internalid", label: "内部 ID"}),
      search.createColumn({
         name: "internalid",
         join: "item",
         label: "内部 ID"
      }),
      search.createColumn({name: "line", label: "行 Id"}),
      search.createColumn({
         name: "formulanumeric",
         formula: "{fxrate}",
         label: "单价"
      }),
      search.createColumn({name: "quantity", label: "数量"}),
      search.createColumn({name: "location", label: "地点"}),
      search.createColumn({name: "inventorylocation", label: "库存地点"}),
      search.createColumn({name: "custbody_aio_account", label: "AIO Account"}),
      search.createColumn({name: "item", label: "货品"}),
      search.createColumn({name: "otherrefnum", label: "采购订单/支票号码"})
   ]
});
var searchResultCount = salesorderSearchObj.runPaged().count;
log.debug("salesorderSearchObj result count",searchResultCount);
salesorderSearchObj.run().each(function(result){
   // .run().each has a limit of 4,000 results
   return true;
});

/*
salesorderSearchObj.id="customsearch1758617089855";
salesorderSearchObj.title="增长事业部&增长自采订单拆单-程序用 (copy)";
var newSearchId = salesorderSearchObj.save();
*/