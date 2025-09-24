/*

监控特定客户账户(162,159)的销售订单
核对预收款与实际订单金额的一致性
验证税费计算的准确性
追踪近期(2025年6月后)创建的订单情况
排除测试或无效订单(金额为0或特定标记的订单)

筛选条件说明
序号	条件字段	条件值	说明
1	type	SalesOrd	仅限销售订单类型
2	custbody_aio_account	162, 159	特定客户账户
3	trandate	2025/06/27 及之后	交易日期范围
4	mainline	True	仅主行项目
5	custbody_fuben	False	排除特定标记的订单
6	fxamount	不等于 0.00	排除金额为0的订单
7	datecreated	2025/07/24 及之后	创建日期范围
属性	值
搜索类型	销售订单 (salesorder)
设置	合并类型: ACCTTYPE
创建时间范围	2025/07/24 及之后
交易日期范围	2025/06/27 及之后

基础信息列
字段名	标签	说明
otherrefnum	采购订单/支票号码	关联的采购订单或支票编号
statusref	状态	订单状态
trandate	日期	订单交易日期
datecreated	创建日期	订单创建日期
shippingcost	发运成本	运输费用
shipstate	发运州/省/自治区/直辖市	发货目的地州/省
shipcity	发运城市	发货目的地城市
custbody139	客户姓名（超长备用字段）	客户姓名信息
custbody_store_credit	店铺信用抵扣	使用的店铺信用金额


预收款相关列
字段名	标签	公式/说明
custbody130	商品预收款金额	商品部分的预收款
custbody133	运费预收款金额	运费部分的预收款
formulanumeric	预收款总金额	{custbody130} + {custbody133}
formulanumeric	订单总计	{fxamount}
formulanumeric	差异	预收款总金额 - 订单总计
formulatext	金额是否相等	判断预收款是否等于订单总额


税务相关列
字段名	标签	公式/说明
formulanumeric	自定义税率-货品税	ROUND(({custbody130}-{custbody116}+{custbody121}+NVL({custbody_store_credit},'0'))*{custbody155.rate}/100,2)
formulanumeric	自定义税率-运费税	ROUND({shippingcost}*{custbody156.rate}/100,2)
formulanumeric	货品税	{custbody116}-{custbody121}
custbody121	运费税额	运费部分的税额
formulatext	自定义税率-税费是否相等	判断自定义计算税费是否等于系统税费
*/


var salesorderSearchObj = search.create({
   type: "salesorder",
   settings:[{"name":"consolidationtype","value":"ACCTTYPE"}],
   filters:
   [
      ["type","anyof","SalesOrd"], 
      "AND", 
      ["custbody_aio_account","anyof","162","159"], 
      "AND", 
      ["trandate","onorafter","2025/06/27"], 
      "AND", 
      ["mainline","is","T"], 
      "AND", 
      ["custbody_fuben","is","F"], 
      "AND", 
      ["fxamount","notequalto","0.00"], 
      "AND", 
      ["datecreated","onorafter","2025/07/24 12:00 上午"]
   ],
   columns:
   [
      search.createColumn({name: "otherrefnum", label: "采购订单/支票号码"}),
      search.createColumn({name: "statusref", label: "状态"}),
      search.createColumn({name: "trandate", label: "日期"}),
      search.createColumn({name: "datecreated", label: "创建日期"}),
      search.createColumn({name: "custbody130", label: "商品预收款金额"}),
      search.createColumn({name: "custbody133", label: "运费预收款金额"}),
      search.createColumn({
         name: "formulanumeric",
         formula: "{custbody130} + {custbody133}",
         label: "预收款总金额"
      }),
      search.createColumn({
         name: "formulanumeric",
         formula: "{fxamount}",
         label: "订单总计"
      }),
      search.createColumn({
         name: "formulanumeric",
         formula: "{custbody130} + {custbody133} - {fxamount}",
         label: "差异"
      }),
      search.createColumn({
         name: "formulatext",
         formula: "CASE      WHEN {custbody130} + {custbody133} = {fxamount} THEN '是'     ELSE '否' END",
         label: "金额是否相等"
      }),
      search.createColumn({name: "shippingcost", label: "发运成本"}),
      search.createColumn({name: "shipstate", label: "发运州/省/自治区/直辖市"}),
      search.createColumn({name: "shipcity", label: "发运城市"}),
      search.createColumn({name: "custbody139", label: "客户姓名（超长备用字段）"}),
      search.createColumn({
         name: "formulanumeric",
         formula: "ROUND(({custbody130}-{custbody116}+{custbody121}+NVL({custbody_store_credit},'0'))*{custbody155.rate}/100,2)",
         label: "自定义税率-货品税"
      }),
      search.createColumn({
         name: "formulanumeric",
         formula: "ROUND({shippingcost}*{custbody156.rate}/100,2)",
         label: "自定义税率-运费税"
      }),
      search.createColumn({
         name: "formulanumeric",
         formula: "{custbody116}-{custbody121}",
         label: "货品税"
      }),
      search.createColumn({name: "custbody121", label: "运费税额"}),
      search.createColumn({
         name: "formulatext",
         formula: "CASE      WHEN ROUND(({custbody130}-{custbody116}+{custbody121}+NVL({custbody_store_credit},'0'))*{custbody155.rate}/100,2)+ROUND({shippingcost}*{custbody156.rate}/100,2) = {custbody116} THEN '是'     ELSE '否' END",
         label: "自定义税率-税费是否相等"
      }),
      search.createColumn({name: "custbody_store_credit", label: "店铺信用抵扣"})
   ]
});
var searchResultCount = salesorderSearchObj.runPaged().count;
log.debug("salesorderSearchObj result count",searchResultCount);
salesorderSearchObj.run().each(function(result){
   // .run().each has a limit of 4,000 results
   return true;
});

/*
salesorderSearchObj.id="customsearch1758016586636";
salesorderSearchObj.title="ZG订单-预收款金额核对 (copy)";
var newSearchId = salesorderSearchObj.save();
*/




var salesorderSearch = nlapiSearchRecord("salesorder",null,
[
   ["type","anyof","SalesOrd"], 
   "AND", 
   ["custbody_aio_account","anyof","162","159"], 
   "AND", 
   ["trandate","onorafter","2025/06/27"], 
   "AND", 
   ["mainline","is","T"], 
   "AND", 
   ["custbody_fuben","is","F"], 
   "AND", 
   ["fxamount","notequalto","0.00"], 
   "AND", 
   ["datecreated","onorafter","2025/07/24 12:00 上午"]
], 
[
   new nlobjSearchColumn("otherrefnum"), 
   new nlobjSearchColumn("statusref"), 
   new nlobjSearchColumn("trandate"), 
   new nlobjSearchColumn("datecreated"), 
   new nlobjSearchColumn("custbody130"), 
   new nlobjSearchColumn("custbody133"), 
   new nlobjSearchColumn("formulanumeric").setFormula("{custbody130} + {custbody133}"), 
   new nlobjSearchColumn("formulanumeric").setFormula("{fxamount}"), 
   new nlobjSearchColumn("formulanumeric").setFormula("{custbody130} + {custbody133} - {fxamount}"), 
   new nlobjSearchColumn("formulatext").setFormula("CASE      WHEN {custbody130} + {custbody133} = {fxamount} THEN '是'     ELSE '否' END"), 
   new nlobjSearchColumn("shippingcost"), 
   new nlobjSearchColumn("shipstate"), 
   new nlobjSearchColumn("shipcity"), 
   new nlobjSearchColumn("custbody139"), 
   new nlobjSearchColumn("formulanumeric").setFormula("ROUND(({custbody130}-{custbody116}+{custbody121}+NVL({custbody_store_credit},'0'))*{custbody155.rate}/100,2)"), 
   new nlobjSearchColumn("formulanumeric").setFormula("ROUND({shippingcost}*{custbody156.rate}/100,2)"), 
   new nlobjSearchColumn("formulanumeric").setFormula("{custbody116}-{custbody121}"), 
   new nlobjSearchColumn("custbody121"), 
   new nlobjSearchColumn("formulatext").setFormula("CASE      WHEN ROUND(({custbody130}-{custbody116}+{custbody121}+NVL({custbody_store_credit},'0'))*{custbody155.rate}/100,2)+ROUND({shippingcost}*{custbody156.rate}/100,2) = {custbody116} THEN '是'     ELSE '否' END"), 
   new nlobjSearchColumn("custbody_store_credit")
]
);