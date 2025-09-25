[TOC]
# 基础信息录入
## 货品相关
自定义记录-品类，csv批量导入会重复，需去重后导入
# 销售订单
## ZG退款

1. 货品行已开票场景
- 按照退款子记录提供的SKU和各金额信息生成退货授权和贷项通知单。
- 关闭退货授权（我司退款不退货）。
2. 货品行未开票且订单行整行退款
- 关闭SO整行。
- 将对应logistics包裹行标记为已取消。
3. 货品行未开票只部分退货
- 框架已搭建，代码块尚需完善。
4. 存在客户存款时的特殊场景处理
- 尚未开始加入特殊场景处理代码。
5. 无货品时
- 直接生成贷项通知单做销售折让。
- 尚未加入该处理代码。
错误处理机制
- 请确保在执行每一步骤之前检查相关数据的有效性和完整性。
- 在处理过程中，如果遇到任何问题，请记录错误日志并及时通知相关人员。

# 供应链物流
## 采购货柜单问题
1. **公司间交易报错**,刷新之后 再点 也还是有这个  
    A：sku是非活动，去找采购
![alt text](企业微信截图_17587664586983.png)

2. 首次入库日期 custitem_first_date  
   搜索：SKU首次入库日期-程序用  
   货物收到国外仓库的时候的值
![alt text](image.png)  
---
# 程序脚本学习
## ava固定税费测试-逻辑说明
### 概述
此用户事件脚本主要用于在销售订单保存前根据特定条件自动计算并设置商品税码和运费税码。脚本的主要功能包括： 
- 地址变更时计算税码。
- 备注触发条件为“固定税码”时重新计算税码。
- 创建销售订单时，如果店铺信用大于0，计算并设置税码。
- 特定店铺（AIO为"193"的店铺）在任何情况下都计算并设置税码。
### 主要逻辑
1. 获取上下文记录

```javascript
var newRecord = context.newRecord;
var AIO = newRecord.getValue("custbody_aio_account");
```
* newRecord: 获取即将保存的新记录。
* AIO: 获取自定义字段custbody_aio_account的值。

2. 决定使用的新旧记录
```javascript

if (AIO !== "193") {
    var oldRecord = context.oldRecord;
    if (context.type !== 'edit') return;
} else {
    var oldRecord = newRecord;
}
```
* 如果AIO不等于"193"，且操作类型不是编辑，则返回。
* 如果AIO等于"193"，则oldRecord等于newRecord

3. 检查禁用税码计算字段
```javascript
var disableTaxCalculation = newRecord.getValue("custbody_ava_disable_tax_calculation");
if (disableTaxCalculation) return;
```
4. 获取发货地址信息
```javascript
var newShipstate = newRecord.getValue("Shipstate");
var newZIP = newRecord.getValue("shipzip");
var oldShipstate = oldRecord.getValue("Shipstate");
var oldZIP = oldRecord.getValue("shipzip");
```
* newShipstate: 获取新记录的发货州。
* newZIP: 获取新记录的发货邮编。
* oldShipstate: 获取旧记录的发货州。
* oldZIP: 获取旧记录的发货邮编。

5. 获取备注信息
```javascript
var newMemo = newRecord.getValue("custbody139");
var oldMemo = oldRecord.getValue("custbody139");
newMemo 和 oldMemo: 获取新记录和旧记录的备注字段custbody139的值。
```
6. 检查项目子列表
```javascript
var count = newRecord.getLineCount('item');
var oldcount = oldRecord.getLineCount('item');
var isPaymentItem = false;
if (oldcount < count) {
    var itemType = newRecord.getSublistValue('item', 'itemtype', count - 1);
    if (itemType == "Payment") {
        isPaymentItem = true;
    }
}
```
* count 和 oldcount: 获取新旧记录的项目子列表行数。
* isPaymentItem: 标记是否添加了类型为“Payment”的项目。

7. 地址变更触发条件
```javascript
if (newShipstate != oldShipstate || newZIP != oldZIP) {
    setTax(oldRecord, newRecord);
    log.debug("地址变更开始计算税率AIO:", AIO);
}
```
* 如果发货州或邮编发生变化，则调用setTax函数计算并设置税码。
8. 备注触发条件
```javascript
if (newMemo != oldMemo && newMemo == "固定税码") {
    setTax(oldRecord, newRecord);
    log.debug("已根据备注重新生成税码", "已根据备注重新生成税码");
}
```
* 如果备注内容为“固定税码”，则调用setTax函数重新计算并设置税码。
9. 创建时检查店铺信用
```javascript
if (context.type === 'create') {
    var storeCredit = newRecord.getValue("custbody_store_credit");
    if (storeCredit > 0) {
        setTax(oldRecord, newRecord);
        log.debug("创建时店铺信用大于0开始计算税率", "创建时店铺信用大于0开始计算税率");
    }
}
```
* 如果操作类型是创建，并且custbody_store_credit字段的值大于0，则调用setTax函数计算并设置税码。
10. 特定店铺处理
```javascript
if (AIO == '193') {
    log.debug("zg线下店铺", "1");
    setTax(oldRecord, newRecord);
}
```
* 如果AIO等于"193"，则表示是特定的线下店铺，无论是否有地址变更，都会调用setTax函数计算并设置税码。
11. 错误处理
```javascript
} catch (e) {
    log.error("message", e);
}
```
* 使用try...catch结构捕获和处理可能的错误，并记录错误信息。
### setTax 函数
setTax函数用于计算并设置商品税码和运费税码。 
1. 清除税额覆盖字段
```javascript
newRecord.setValue({
    fieldId: 'taxamountoverride',
    value: null
});
```
* 清除新记录中的taxamountoverride字段的值。

2. 计算商品税码
```javascript
var itemTax_t = oldRecord.getValue("custbody116") - oldRecord.getValue("custbody121");
var shipTax_t = oldRecord.getValue("custbody121");
var subtotal = oldRecord.getValue("subtotal");
var discount = oldRecord.getValue("discounttotal");
var total = subtotal + discount;
for (var t = 0; t < oldcount; t++) {
    var itemType = oldRecord.getSublistValue('item', 'itemtype', t);
    if (itemType == "Payment") {
        total -= oldRecord.getSublistValue('item', 'amount', t);
    }
}
var itemtaxRate = itemTax_t / total * 100;
if (itemtaxRate == "0" || itemType == "Payment") {
    itemTaxId = -7;
} else {
    search.create({
        type: "salestaxitem",
        filters: [
            ["name", "is", itemtaxRate]
        ],
        columns: [
            search.createColumn({ name: "internalid", label: "内部 ID" })
        ]
    }).run().each(function(result) {
        itemTaxId = result.id;
        log.debug("税码", itemTaxId);
    });
}
if (!itemTaxId) {
    var customRecord = record.create({
        type: record.Type.SALES_TAX_ITEM,
        defaultValues: {
            nexuscountry: 'US'
        },
        isDynamic: true,
    });
    customRecord.setValue('itemid', itemtaxRate); // 税名
    customRecord.setValue('rate', itemtaxRate); // 税率
    customRecord.setValue('subsidiary', 49); // 子公司
    customRecord.setValue('taxagency', 24395125); // 税务代理
    customRecord.setValue('taxaccount', 209); // 纳税科目
    customRecord.setText('description', "商品税用，销售订单：" + newRecord.getValue('otherrefnum')); // 说明
    itemTaxId = customRecord.save();
}
for (var y = 0; y < count; y++) {
    var itemType = newRecord.getSublistValue('item', 'itemtype', y);
    if (itemType == "Payment") {
        newRecord.setSublistValue('item', 'taxcode', y, -7);
    } else {
        newRecord.setSublistValue('item', 'taxcode', y, itemTaxId);
    }
}
```
* 计算商品税码和运费税码。
* 如果找不到相应的税码，则创建一个新的税码记录。
* 为每个项目设置相应的税码。


- [ ] 脚本的主要功能是在销售订单保存前，根据发货地址的变更、备注内容的变化、创建时店铺信用大于0的情况，以及特定店铺（AIO为"193"的店铺）的条件，自动计算并设置商品税码和运费税码。通过这种方式，可以确保销售订单在保存时具有正确的税码信息，从而避免手动设置的错误。



    | 字段名                                 | 描述                     |
    | -------------------------------------- | ------------------------ |
    | `custbody_aio_account`                 | 自定义字段，AIO账户      |
    | `custbody_ava_disable_tax_calculation` | 自定义字段，禁用税码计算 |
    | `shipstate`                            | 发货州                   |
    | `shipzip`                              | 发货邮编                 |
    | `custbody139`                          | 自定义字段，备注         |
    | `taxamountoverride`                    | 税额覆盖                 |
    | `custbody116`                          | 自定义字段，商品税总额   |
    | `custbody121`                          | 自定义字段，运费税总额   |
    | `subtotal`                             | 商品小计                 |
    | `discounttotal`                        | 折扣总额                 |
    | `itemtype`                             | 项目类型                 |
    | `amount`                               | 项目金额                 |
    | `itemid`                               | 税码ID /税名             |
    | `rate`                                 | 税率                     |
    | `subsidiary`                           | 子公司                   |
    | `taxagency`                            | 税务代理                 |
    | `taxaccount`                           | 纳税科目                 |
    | `description`                          | 描述                     |
    | `otherrefnum`                          | 其他参考号               |
    | `shippingcost`                         | 运费成本                 |
    | `shippingtaxcode`                      | 运费税码                 |
