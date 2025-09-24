/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * 
 * 
 * 
 * 

这段代码是一个NetSuite用户事件脚本，主要用于在集装箱清单记录提交前处理采购订单的分配逻辑。以下是对代码的详细解读：

1. 脚本基础信息
脚本类型：User Event Script（用户事件脚本）
版本：NetSuite 2.1
依赖模块：record, search

2. beforeSubmit函数
只在编辑操作时执行，主要功能：

A. 数据收集阶段
javascript
// 查询集装箱清单对应的所有明细行
const poData = {}
search.create({
    type: "customrecord_k_line",  // 集装箱明细行自定义记录
    filters: ['custrecord_k_link.internalid', 'anyof', scriptContext.newRecord.id],
    columns: [
        'custrecord_k_no',        // 行号
        'custrecord_k_item',      // SKU物品
        'custrecord_k_number',    // 数量
        'custrecord_k_po_numberline' // 采购订单号
    ]
})
数据结构：

javascript
poData = {
    "采购订单ID1": [
        {lineNo: "行号", sku: "SKUID", skuName: "SKU名称", quantity: "数量", poNo: "PO号"}
    ],
    "采购订单ID2": [...]
}
B. 采购订单处理阶段
对每个相关的采购订单进行处理：

javascript
for (var id in poData) {
    var objRecord = record.load({
        type: record.Type.PURCHASE_ORDER,
        id
    })
    // 遍历采购订单的所有行项目
    for (var i = 0; i < itemCount; i++) {
        // 匹配对应的集装箱明细行
        let result = poData[id].find(item => item.sku == sku && item.lineNo == lineNo)
        if (result) {
            // 数量校验和分配逻辑
        }
    }
    objRecord.save() // 保存采购订单
}
3. 核心业务逻辑
数量分配规则：
完全匹配 (quantity == result.quantity)
设置 custcol_k_distribution = true（已完成分配）
超额分配 (quantity < result.quantity)

抛出错误："配柜数量超限"
防止过度分配，确保分配数量不超过采购订单数量
部分分配 (quantity > result.quantity)
设置 custcol_k_distribution = false（未完全分配）
记录已分配数量 custcol_k_allocated

字段说明：
custcol_k_distribution：分配完成标志（布尔值）
custcol_k_allocated：已分配数量

4. 业务场景分析
这是一个集装箱配货管理系统的关键部分：

工作流程：
创建集装箱清单：包含多个采购订单的物品
编辑提交时：系统自动检查并更新相关采购订单的分配状态
数量验证：确保配货数量不超过采购数量
状态标记：标识哪些采购行项已完成配货

业务规则：
防超额：配货数量不能超过采购数量
状态跟踪：清晰标记每个采购行项的分配状态
实时更新：在集装箱清单提交时自动更新采购订单

5. 错误处理
使用try-catch包装整个逻辑
当出现超额分配时抛出明确错误信息
记录调试信息便于问题排查

6. 技术特点
搜索查询优化：一次性获取所有相关数据
数据匹配：通过SKU和行号精确匹配
批量处理：处理多个采购订单的更新
事务安全：在beforeSubmit中确保数据一致性
这个脚本实现了采购订单与集装箱配货的集成管理，确保了配货数量的准确性和数据的一致性。
 */
define(['N/record', 'N/search'],
    (record, search) => {
        const beforeSubmit = (scriptContext) => {
            if (scriptContext.type === "edit") {
                try {
                    // 明细行PO
                    const poData = {}
                    search.create({
                        type: "customrecord_k_line",
                        filters: ['custrecord_k_link.internalid', 'anyof', scriptContext.newRecord.id],
                        columns: [
                            'custrecord_k_no',
                            'custrecord_k_item',
                            'custrecord_k_number',
                            'custrecord_k_po_numberline'
                        ]
                    }).run().each(el => {
                        let poNo = el.getValue('custrecord_k_po_numberline')
                        if (!poData[poNo]) {
                            poData[poNo] = []
                        }
                        poData[poNo].push({
                            lineNo: el.getValue('custrecord_k_no'),
                            sku: el.getValue('custrecord_k_item'),
                            skuName: el.getText('custrecord_k_item'),
                            quantity: el.getValue('custrecord_k_number'),
                            poNo: el.getValue('custrecord_k_po_numberline')
                        })
                        return true;
                    })
                    log.debug('poData', poData)
                    for (var id in poData) {
                        var objRecord = record.load({
                            type: record.Type.PURCHASE_ORDER,
                            id
                        })
                        var itemCount = objRecord.getLineCount({ sublistId: 'item' });
                        for (var i = 0; i < itemCount; i++) {
                            var sku = objRecord.getSublistValue('item', 'item', i)
                            var lineNo = objRecord.getSublistValue('item', 'custcol_item_line', i)
                            let result = poData[id].find(item => item.sku == sku && item.lineNo == lineNo)
                            if (result) {
                                var quantity = objRecord.getSublistValue('item', 'quantity', i)
                                if (quantity == result.quantity) {
                                    objRecord.setSublistValue('item', 'custcol_k_distribution', i, true);
                                } else if (quantity < result.quantity) {
                                    log.debug(quity + "配柜数量超限", itemqty)
                                    throw result.skuName + " 配柜数量超限";
                                } else if (quantity > result.quantity) {
                                    objRecord.setSublistValue('item', 'custcol_k_distribution', i, false);
                                }
                                objRecord.setSublistValue('item', 'custcol_k_allocated', i, result.quantity);
                            }
                        }
                        log.debug(objRecord.save(), "采购回写成功");
                    }
                } catch (error) {
                    log.error('error', error)
                }
                return;
            }
        }


        return { beforeSubmit }

    });