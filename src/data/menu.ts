import type { MenuItem } from "../types";

export const MENU_STORAGE_KEY = "harbour-admin-menu";

export function dishPhotoPath(id: string): string {
  return `${import.meta.env.BASE_URL}dish-photos/${id}.jpg`;
}

export function seedDish(id: string, name: string, description: string, category: string, price: number): MenuItem {
  return {
    id,
    name,
    description,
    category,
    price,
    imageUrl: dishPhotoPath(id),
    soldOut: false,
    deleted: false,
  };
}

export const seedMenuItems: MenuItem[] = [
  seedDish("char-siu", "蜜汁叉燒飯", "明爐叉燒、時蔬、香米飯", "飯類", 68),
  seedDish("roast-goose-rice", "燒鵝飯", "脆皮燒鵝、油香白飯、梅子醬", "飯類", 98),
  seedDish("soy-chicken-rice", "豉油雞飯", "嫩滑豉油雞、薑蔥、菜心", "飯類", 62),
  seedDish("hainan-chicken-rice", "海南雞飯", "白切雞、雞油飯、三色醬", "飯類", 72),
  seedDish("beef-brisket-rice", "牛腩飯", "柱侯牛腩、蘿蔔、香米飯", "飯類", 78),
  seedDish("curry-beef-rice", "咖喱牛腩飯", "港式咖喱、軟腍牛腩、薯仔", "飯類", 82),
  seedDish("tomato-porkchop-rice", "焗茄汁豬扒飯", "香煎豬扒、番茄汁、白飯", "飯類", 76),
  seedDish("yangzhou-fried-rice", "揚州炒飯", "蝦仁、叉燒、雞蛋、青豆", "飯類", 68),
  seedDish("seafood-fried-rice", "海鮮炒飯", "鮮蝦、帶子、魷魚、蛋香飯", "飯類", 88),
  seedDish("claypot-eel-rice", "鰻魚煲仔飯", "蒲燒鰻魚、煲仔飯、甜豉油", "飯類", 108),

  seedDish("shrimp-dumpling", "鮮蝦餃皇", "晶瑩薄皮，鮮蝦爽彈", "點心", 42),
  seedDish("pork-siu-mai", "蟹籽燒賣", "豬肉鮮蝦、蟹籽點綴", "點心", 38),
  seedDish("bbq-pork-bun", "叉燒包", "鬆軟包皮、蜜汁叉燒餡", "點心", 32),
  seedDish("custard-bun", "流沙奶皇包", "鹹蛋黃奶皇、熱食流心", "點心", 36),
  seedDish("turnip-cake", "香煎蘿蔔糕", "臘味蘿蔔糕、外脆內軟", "點心", 34),
  seedDish("spring-roll", "脆皮春卷", "鮮蔬肉絲、香脆金黃", "點心", 30),
  seedDish("rice-roll", "鮮蝦腸粉", "滑身腸粉、鮮蝦、甜豉油", "點心", 46),
  seedDish("phoenix-claw", "豉汁鳳爪", "蒸至軟糯、豉汁入味", "點心", 36),
  seedDish("spare-ribs", "豉汁蒸排骨", "蒜香豉汁、排骨嫩滑", "點心", 42),
  seedDish("xiao-long-bao", "小籠湯包", "薄皮湯汁、鮮肉餡", "點心", 44),

  seedDish("wonton-noodle", "鮮蝦雲吞麵", "竹昇細麵、鮮蝦雲吞、清湯", "麵類", 56),
  seedDish("beef-brisket-noodle", "牛腩湯麵", "柱侯牛腩、清湯幼麵", "麵類", 68),
  seedDish("fishball-noodle", "魚蛋河粉", "彈牙魚蛋、滑身河粉", "麵類", 52),
  seedDish("satay-beef-noodle", "沙嗲牛肉麵", "濃香沙嗲、嫩牛肉片", "麵類", 58),
  seedDish("cart-noodle", "港式車仔麵", "多款配料、惹味湯底", "麵類", 48),
  seedDish("roast-goose-lai-fun", "燒鵝瀨粉", "燒鵝件、米香瀨粉", "麵類", 88),
  seedDish("dry-scallion-noodle", "蔥油撈麵", "蔥油香、爽口竹昇麵", "麵類", 46),
  seedDish("seafood-laksa", "海鮮喇沙", "椰香湯底、鮮蝦魷魚", "麵類", 78),
  seedDish("black-pepper-udon", "黑椒牛柳烏冬", "黑椒汁、牛柳、彈牙烏冬", "麵類", 82),
  seedDish("tomato-egg-noodle", "番茄蛋湯麵", "番茄湯底、滑蛋、幼麵", "麵類", 50),

  seedDish("stir-fried-beef", "時蔬炒牛肉", "鑊氣十足，牛肉嫩滑", "小菜", 88),
  seedDish("steamed-fish", "清蒸海上鮮", "蔥薑豉油，每日鮮魚供應", "小菜", 138),
  seedDish("sweet-sour-pork", "菠蘿咕嚕肉", "酸甜開胃、外脆內嫩", "小菜", 86),
  seedDish("salt-pepper-squid", "椒鹽鮮魷", "椒鹽香脆、鮮魷彈牙", "小菜", 98),
  seedDish("garlic-choi-sum", "蒜蓉菜心", "清甜菜心、蒜香惹味", "小菜", 48),
  seedDish("claypot-tofu", "海鮮豆腐煲", "滑豆腐、海鮮、濃郁煲汁", "小菜", 92),
  seedDish("typhoon-crab", "避風塘炒蟹", "蒜酥香辣、蟹肉鮮甜", "小菜", 188),
  seedDish("black-bean-clams", "豉椒炒蜆", "豉椒鮮香、蜆肉飽滿", "小菜", 88),
  seedDish("swiss-wings", "瑞士雞翼", "甜豉油滷香、雞翼入味", "小菜", 58),
  seedDish("mapo-tofu", "麻婆豆腐", "微辣惹味、豆腐嫩滑", "小菜", 62),

  seedDish("mango-pomelo", "楊枝甘露", "香芒、柚子、西米，清甜順滑", "甜品", 38),
  seedDish("egg-tart", "酥皮蛋撻", "牛油酥皮、嫩滑蛋香", "甜品", 18),
  seedDish("coconut-pudding", "椰汁糕", "椰香濃郁、口感清爽", "甜品", 28),
  seedDish("red-bean-soup", "陳皮紅豆沙", "紅豆綿密、陳皮清香", "甜品", 32),
  seedDish("tofu-pudding", "薑汁豆腐花", "豆香細滑、薑汁微辣", "甜品", 30),
  seedDish("sesame-soup", "芝麻糊", "黑芝麻香濃、熱食暖胃", "甜品", 34),
  seedDish("grass-jelly", "仙草涼粉", "清涼爽滑、配糖水", "甜品", 26),
  seedDish("mango-pancake", "芒果班戟", "鮮芒果、忌廉、薄班戟皮", "甜品", 42),
  seedDish("pineapple-bun", "菠蘿油", "香脆菠蘿包、厚切牛油", "甜品", 24),
  seedDish("milk-tea-pudding", "奶茶布甸", "港式奶茶香、滑身布甸", "甜品", 36),

  seedDish("hk-milk-tea", "港式奶茶", "茶味濃厚、奶香順滑", "飲品", 22),
  seedDish("lemon-tea", "凍檸茶", "紅茶清香、新鮮檸檬", "飲品", 24),
  seedDish("yuenyeung", "鴛鴦", "咖啡奶茶混合、港式經典", "飲品", 25),
  seedDish("lemon-coke", "凍檸樂", "可樂氣泡、檸檬清新", "飲品", 24),
  seedDish("red-bean-ice", "紅豆冰", "紅豆、淡奶、碎冰", "飲品", 32),
  seedDish("soy-milk", "冰豆漿", "豆香清甜、冰涼解膩", "飲品", 18),
  seedDish("chrysanthemum-tea", "菊花茶", "清香回甘、冷熱皆宜", "飲品", 18),
  seedDish("iced-coffee", "凍咖啡", "香濃咖啡、冰涼提神", "飲品", 25),
  seedDish("lime-soda", "青檸梳打", "青檸酸香、氣泡清爽", "飲品", 28),
  seedDish("bottled-water", "樽裝水", "簡單清爽、佐餐必備", "飲品", 12),
];

export function getDefaultMenuItems(): MenuItem[] {
  return seedMenuItems.map((item) => ({ ...item, soldOut: false }));
}
