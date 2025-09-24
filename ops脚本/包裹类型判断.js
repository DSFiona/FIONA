/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript

# NetSuite 商品尺寸分类逻辑
## 分类规则表
| 优先级 | 条件 | 分类结果 | 说明 |
|--------|------|----------|------|
| 1 | 重量 ≥ 150 lbs **或** 围长 ≥ 165 **或** 最长边 ≥ 108 | LTL | 需要零担货运的大型物品 |
| 2 | 围长 ≥ 130 **或** 最长边 ≥ 96 | OVERSIZE | 超大尺寸物品 |
| 3 | 重量 ≥ 50 lbs | AHS-weight | 超重物品 |
| 4 | 围长 ≥ 105 **或** 最长边 ≥ 48 **或** 次长边 ≥ 30 | AHS-dimension | 尺寸超标物品 |
| 5 | 不符合以上任何条件 | 普通包裹 | 标准尺寸和重量的物品 |
| - | 参数缺失或为0 | 参数错误 | 尺寸或重量数据不完整 |
## 计算规则说明
### 围长计算公式
 
 */
define(['N/record', 'N/url', 'N/runtime'], function (record, url, runtime) {

    function beforeSubmit(context) {
        if (context.type == 'create' || 'edit') {

            var height = context.newRecord.getValue('custitem_k_high');
            var shortHeight = context.newRecord.getValue('custitem_k_high_short');
            var width = context.newRecord.getValue('custitem_k_wide');
            var depth = context.newRecord.getValue('custitem_k_long');
            var ibs = context.newRecord.getValue('custitem_k_gw_1ibs');

            var girth = 0; //围长
          
            var sku = context.newRecord.getValue('itemid');
            var arr = [ibs, width, depth];
            
          
            if (arr.some(checkValue)) {
                context.newRecord.setValue('custitem_page_type', "参数错误");
                log.error(sku, arr);
            } else {

                if ((height == "" || height == null) && (shortHeight == "" || shortHeight == null)) {
                    context.newRecord.setValue('custitem_page_type', "参数错误1");
                    return;
                }
                if (height === shortHeight) {
                    arr[0] = height;
                } else {
                    arr[0] = height;
                    arr.push(shortHeight);
                }
                arr.sort(max);
                girth = Math.round(arr[0] + (arr[1] + arr[2]) * 2);

                if (ibs >= 150 || girth >= 165 || arr[0] >= 108) {
                    context.newRecord.setValue('custitem_page_type', "LTL");
                } else if (girth >= 130 || arr[0] >= 96) {
                    context.newRecord.setValue('custitem_page_type', "OVERSIZE");
                } else if (ibs >= 50) {
                    context.newRecord.setValue('custitem_page_type', "AHS-weight");
                } else if (girth >= 105 || arr[0] >= 48 || arr[1] >= 30) {
                    context.newRecord.setValue('custitem_page_type', "AHS-dimension");
                } else {
                    context.newRecord.setValue('custitem_page_type', "普通包裹");
                }
            }
            var type = context.newRecord.getValue('custitem_page_type');
            
            log.debug(sku, type);
            
        }
    }
    // 比大小
    function max(a, b) {
        return b - a;
    }
    // 判断取值
    function checkValue(value) {
        return value == 0 || value == null || value == "";
    }
    return {
        beforeSubmit: beforeSubmit
    }
});