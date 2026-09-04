# MarginKit Etsy Calculator 操作说明

版本：v1.0  
适用费率目录：`etsy-us-2026-09-03.1`  
适用范围：美国 Etsy.com 卖家、美国银行账户、USD listing、USD Payment Account

## 1. 这个工具计算什么

MarginKit 提供三种计算方式：

1. **Order profit + Unit economics**：默认模式，用于判断一笔订单在扣除 Etsy 费用和卖家填写的变动成本后是否赚钱。
2. **Order profit + Payment Account**：估算与订单相关的 Etsy Payment Account 净变动。它不是 payout、deposit、available balance 或会计利润。
3. **Target price**：根据目标贡献利润或目标贡献毛利率，寻找满足条件的最低折扣前商品单价。

页面为英文界面。本说明中的粗体英文与页面控件名称一致。

## 2. 打开计算器

### 已启动本地服务时

在浏览器打开：

<http://127.0.0.1:5174/>

### 从项目目录启动

在 PowerShell 中执行：

```powershell
cd "C:\Users\yimin\OneDrive\Desktop\MarginKit"
npm install
npm run dev -- --host 127.0.0.1 --port 5174
```

保持终端窗口运行，然后访问终端显示的地址。按 `Ctrl+C` 停止服务。

## 3. 计算订单贡献利润

### 第一步：选择模式和口径

1. 选择顶部的 **Order profit**。
2. **Calculation basis** 保持 **Unit economics**。这是默认且推荐的长期单位经济口径。

### 第二步：填写订单商品

在 **Order** 区域填写：

| 字段 | 填写方式 |
|---|---|
| **Unit list price** | 单件商品在卖家折扣前的 listing 价格。 |
| **Quantity** | 本 listing 在该订单中售出的件数，必须是 `1–9,999` 的整数。 |
| **Unit COGS** | 单件商品成本，不是整单商品成本。 |

一单包含多个 listing 时，点击 **Add listing**，逐项填写价格、数量和单件 COGS。垃圾桶图标可删除额外 listing。

### 第三步：填写折扣和买家费用

在 **Discounts & charges** 区域填写：

| 字段 | 填写方式 |
|---|---|
| **Seller-funded item discount** | 卖家承担的商品折扣。选择无折扣、固定金额或百分比。百分比只作用于 merchandise subtotal。 |
| **Personalization charged** | 买家实际支付的 personalization 净额。 |
| **Shipping charged** | 买家实际支付的运费，不是卖家购买 shipping label 的成本。免运费订单填 `0`。 |
| **Gift wrap charged** | 买家实际支付的 gift-wrap 净额。 |
| **Etsy-funded coupon** | Receipt 上显示的 Etsy 资助优惠金额；它与卖家折扣不是同一字段。 |

v1 不支持同时填写 seller-funded discount 和 Etsy-funded coupon。遇到叠加优惠时不要自行合并金额。

### 第四步：设置 Etsy 费用情景

在 **Etsy fee scenario** 区域填写：

1. **Order attribution**：按该订单真实归因选择。无归因时选择 **No attributed program**。
2. Offsite Ads 12% 必须勾选资格确认；不要仅凭预期销售额推断资格。
3. Share & Save intro 6.5% 必须确认已收到邀请，并填写 Etsy 显示的活动截止日期。
4. **Shop state**：Texas 店铺选择 **Texas**，其他美国州选择 **Other US state**。
5. **Sales tax collected by Etsy**：必须填写 receipt 上 Etsy 代收的 sales tax；没有代收时明确填 `0`。

Offsite Ads 与 Share & Save 不能同时选择。**Allocated Etsy Ads spend** 是卖家手动分摊的 CPC 花费，与订单归因下拉框分开填写。

### 第五步：填写变动成本

在 **Costs** 区域填写该订单对应的实际或合理分摊成本：

- **Shipping label**：卖家承担的履约运费。
- **Shipping insurance**：运输保险成本。
- **Packaging**：包装材料成本。
- **Variable labor**：随订单发生的人工成本。
- **Other variable costs**：其他随本订单变化的经营成本。
- **Allocated Etsy Ads spend**：卖家选择分摊给该订单的 Etsy Ads 花费。

固定租金、订阅费和所得税等未在 v1 中自动分摊。确有额外 Etsy fee debit 或 credit 时，可展开 **Manual Etsy adjustments** 填写。两个字段均输入正数，借记或贷记方向由字段名称决定。

### 第六步：计算和查看结果

点击 **Calculate profit**。如果有错误，页面会显示错误摘要并标出字段；修正后重新计算。

主要结果：

| 指标 | 含义 |
|---|---|
| **Estimated contribution profit** | 卖家订单收入减去净 Etsy marketplace fees、经营变动成本和分摊 Etsy Ads。 |
| **Contribution margin** | Contribution profit ÷ seller gross order revenue。 |
| **Contribution ROI** | Contribution profit ÷ total net variable costs；分母不大于零时显示 N/A。 |
| **Avg. profit per item** | 整单贡献利润 ÷ 总售出件数；混合订单只代表平均值。 |
| **Effective Etsy fee rate** | 净 Etsy marketplace fees ÷ seller revenue；包括 Offsite Ads，不包括 Etsy Ads 和履约成本。 |
| **All-in variable cost rate** | 全部净变动成本 ÷ seller revenue。 |

展开 **Full breakdown** 可检查 revenue、transaction fee、processing fee、listing allocation、广告或返费、成本及每条舍入后的金额。

修改任何输入后，旧结果会保留并显示 **Inputs changed · Recalculate**。此时旧结果不是当前输入的结果，必须再次点击计算按钮。

## 4. 估算 Payment Account 净变动

1. 保持 **Order profit** 模式。
2. 将 **Calculation basis** 切换为 **Payment Account**。
3. 按第 3 节填写商品、收入、税、归因和成本。
4. 为每个 listing 选择 **Listing type** 和售后 **Inventory after sale**。
5. **Actual listing fee debits** 通常留空，让系统按标准情景估算；private listing 数量大于 1、手动续刊或特殊状态应填写 statement 上的实际 debit count。这里填的是 `0–9,999` 的扣费次数，不是美元金额。
6. 对 shipping label 和 insurance 选择其支付渠道：**Outside Etsy** 或 **Etsy Payment Account**。
7. Etsy Ads 需要进入账户净变动时，勾选 **Include this Etsy Ads charge in the Payment Account estimate**。
8. 如有 **Carrier adjustment debit**，填写实际扣款。
9. 点击 **Calculate profit**。

### Colorado 实体订单

实体商品寄往 Colorado 时：

1. 勾选 **Physical order shipped to Colorado**。
2. 填写 receipt 上的 **Colorado retail delivery fee**。
3. 必须填写 receipt 或 Payment Account 中的 **Actual processing gross**。

MarginKit 不会推断 Colorado delivery fee 是否进入 processing base；缺少实际 processing gross 时会停止计算。

### 如何理解结果

**Estimated Payment Account change** 只计算与该订单相关的账户活动：seller revenue 减去 estimated statement fees 和通过 Etsy Payment Account 支付的运营扣款。外购包装、人工、COGS 和在 Etsy 外支付的运费不会进入该主结果。

页面仍会在 **Unit economics (secondary)** 中显示 contribution profit，便于同时判断经营上是否赚钱。Payment Account 结果不能用于预测实际打款时间、可用余额、reserve 或 closing balance。

## 5. 计算最低目标价格

### 第一步：进入 Target Price

选择顶部的 **Target price**。此模式固定使用 Unit economics，只支持单个 listing，但 **Quantity** 可以大于 1。

### 第二步：填写产品和目标

1. 填写 **Quantity** 和 **Unit COGS**。
2. 在 **Target type** 中二选一：
   - **Profit target**：目标为整笔模拟订单的 contribution profit。
   - **Margin target**：目标为 contribution margin，范围 `0%` 至小于 `100%`。
3. 填写对应目标值。

### 第三步：填写情景

1. 填写 seller-funded discount、personalization、shipping charged 和 gift wrap。
2. **Sales tax scenario** 必须选择：
   - **No sales tax**：模拟 tax 为 0。
   - **Custom effective rate**：输入针对 seller revenue 的有效订单税率；这只是费用情景，不是税务建议。
3. 填写 attribution、shop state、成本、Etsy Ads 及 manual adjustments。
4. 点击 **Find minimum price**。

输出的 **Minimum unit listing price** 是折扣前、按单件显示的最低整美分 listing 价格。系统会在 `$0.01–$1,000,000.00/unit` 范围搜索；这个上限只是 MarginKit 技术护栏，不是 Etsy 的 listing 限制。

Target Price 不支持 Etsy-funded coupon、mixed basket、Payment Account 口径、Colorado delivery fee、processing gross override、退款或价格联动成本。无有效价格时不会返回近似结果。

## 6. 输入规则与常见错误

- 金额只输入数字，最多两位小数，例如 `12.50`；不要输入 `$`、逗号或负号。
- 百分比最多四位小数，例如 `6.5` 或 `8.3750`。
- 留空的可选金额按 `0` 处理；**Sales tax collected by Etsy** 等标记为必填的字段不能留空。
- Quantity 必须是 `1–9,999` 的整数。
- 固定 seller-funded discount 不能超过 merchandise subtotal 加 personalization。
- Etsy-funded coupon 不能超过 seller gross order revenue。
- Seller revenue 必须大于 `0`；actual processing gross 不能小于 seller revenue。
- Etsy-funded coupon 不能与 seller-funded discount 或 Share & Save intro 6.5% 组合。
- 若显示 **Inputs changed · Recalculate**，请重新点击计算按钮。
- 若费率目录缺失、冲突或不适用于当前情景，系统会 fail closed，不会用 `0` 或最近费率代替。

## 7. 当前不支持的订单

以下场景不会自动计算：

- 非美国 seller 或 bank account、非 USD listing 或 Payment Account。
- Pattern、Square 或线下交易。
- Refund、cancellation、chargeback、Purchase Protection。
- 历史订单费率回算、外币换算、reserve、deposit timing。
- Setup fee、subscription、income tax、self-employment tax。
- 未提供实际 processing gross 的 Colorado 实体订单 Statement 估算。
- 卖家折扣与 Etsy-funded coupon 叠加，以及 personalization/gift-wrap 的促销分摊。

这些场景不要用相近选项替代。应保留为未支持，并以 Etsy receipt、Payment Account statement 或会计资料单独核对。

## 8. 示例

### 示例 A：基础订单利润

输入：unit price `$20.00`、quantity `1`、unit COGS `$5.00`、sales tax `0`，其余为 `0`，无 attribution。

预期：Etsy fees `$2.35`，contribution profit `$12.65`，contribution margin `63.25%`。

### 示例 B：目标价格

输入：quantity `1`、unit COGS `$5.00`、profit target `$10.00`、No sales tax、无折扣和 attribution。

预期最低折扣前 unit listing price：`$17.07`。价格 `$17.06` 时 modeled contribution profit 为 `$9.99`，不满足目标。

## 9. 重置、隐私和数据保存

- 点击计算按钮旁的重置图标可恢复该模式的默认输入。
- 所有计算都在浏览器本地完成。
- v1 不会把金额写入 URL，也不默认写入 localStorage。
- 刷新页面会清除手动填写的数据；重要输入请另行保留在自己的订单记录中。
- 不要在 analytics、错误日志或广告参数中加入财务输入。

## 10. 开发与验收命令

在项目根目录执行：

```powershell
npm test
npm run build
npm run preview
```

- `npm test`：运行费用公式和 Target Price 自动化测试。
- `npm run build`：执行 TypeScript 检查并生成 `dist` 生产构建。
- `npm run preview`：本地预览生产构建；访问终端显示的 URL。

公开部署前仍需完成生产域名、规范路径、静态隐私页面、法律主体信息、CMP、AdSense、`ads.txt`、缓存压缩和安全响应头配置。
