var itemreceiptSearchObj = search.create({
   type: "itemreceipt",
   settings:[{"name":"consolidationtype","value":"NONE"}],
   filters:
   [
      ["type","anyof","ItemRcpt"], 
      "AND", 
      ["mainline","is","F"], 
      "AND", 
      ["createdfrom.type","anyof","TrnfrOrd"], 
      "AND", 
      ["trandate","onorafter","2025/06/01"], 
      "AND", 
      ["createdfrom.custbody_k_box_numb","noneof","@NONE@"], 
      "AND", 
      ["count(formulatext: SUBSTR({memo},1,INSTR({memo},':')-1))","equalto","0"]
   ],
   columns:
   [
      search.createColumn({
         name: "custbody_k_bl_no",
         summary: "GROUP",
         label: "提单号"
      }),
      search.createColumn({
         name: "formulatext",
         summary: "COUNT",
         formula: "SUBSTR({memo},1,INSTR({memo},':')-1)",
         label: "公式（文本）"
      })
   ]
});
var searchResultCount = itemreceiptSearchObj.runPaged().count;
log.debug("itemreceiptSearchObj result count",searchResultCount);
itemreceiptSearchObj.run().each(function(result){
   // .run().each has a limit of 4,000 results
   return true;
});

/*
itemreceiptSearchObj.id="customsearch1758794644374";
itemreceiptSearchObj.title="货品收据-实际分摊金额（货品）- 是否分摊检查fiona (copy)";
var newSearchId = itemreceiptSearchObj.save();
*/