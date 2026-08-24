// 常量配置：排行标签、历法表、默认值、存储键

export const LS_KEY = "jiapu_data_v1";

export const DEFAULT_TITLE = "某氏家谱";
export const DEFAULT_SUB = "— 世代源流图 —";

// 排行文字（1→长，2→次 …），子/女由性别决定
export const RANK_NUMS = ["", "长", "次", "三", "四", "五", "六", "七", "八", "九", "十"];

// 干支 / 生肖
export const GAN = "甲乙丙丁戊己庚辛壬癸";
export const ZHI = "子丑寅卯辰巳午未申酉戌亥";
export const ANIMALS = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];

// 封建纪年（用于农历换算展示），民国之后为空
export const REIGNS = [
  ["天命", 1616, 1626], ["天聪", 1626, 1636], ["崇德", 1636, 1643], ["顺治", 1644, 1661],
  ["康熙", 1662, 1722], ["雍正", 1723, 1735], ["乾隆", 1736, 1795], ["嘉庆", 1796, 1820],
  ["道光", 1821, 1850], ["咸丰", 1851, 1861], ["同治", 1862, 1874], ["光绪", 1875, 1908], ["宣统", 1909, 1911],
  ["民国", 1912, 1948],
];

// 示例数据（首次打开或「恢复示例」时使用）
export const DEMO = [
  { id: "1", name: "张始祖", zi: "字某某", birth: "1825", death: "1890", spouse: "王氏" },
  { id: "2", name: "张长房", birth: "1855", death: "1912", spouse: "李氏", parent: "1" },
  { id: "3", name: "张次房", birth: "1860", spouse: "赵氏", parent: "1" },
  { id: "4", name: "张大房长子", birth: "1885", spouse: "刘氏", parent: "2" },
  { id: "5", name: "张大房次子", birth: "1888", spouse: "陈氏", parent: "2" },
  { id: "6", name: "张次房子", birth: "1895", spouse: "孙氏", parent: "3" },
  { id: "7", name: "张四代·甲", birth: "1925", death: "2001", spouse: "周氏", note: "居北京", tomb: "苏州", parent: "4" },
  { id: "8", name: "张四代·乙", birth: "1930", spouse: "吴氏", parent: "5" },
  { id: "9", name: "张四代·丙", birth: "1935", parent: "6" },
  { id: "10", name: "张五代·A", birth: "1955", spouse: "郑氏", note: "居北京", parent: "7" },
  { id: "11", name: "张五代·B", birth: "1958", parent: "7" },
  { id: "12", name: "张五代·C", birth: "1962", spouse: "冯氏", parent: "8" },
  { id: "13", name: "张五代·D", birth: "1968", parent: "9" },
];
