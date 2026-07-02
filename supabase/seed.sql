-- Demo seed data for harbour-ordering-h5.
-- Safe to run more than once: restaurant, settings, printer settings, tables,
-- menu items, and named demo staff are upserted or inserted only when missing.

with restaurant as (
  insert into public.restaurants (slug, name, phone, address, default_language, active)
  values ('harbour-demo', '海港小館', '2188 6688', '香港灣仔軒尼詩道 88 號', 'zh-Hant', true)
  on conflict (slug) do update
    set name = excluded.name,
        phone = excluded.phone,
        address = excluded.address,
        default_language = excluded.default_language,
        active = excluded.active,
        updated_at = now()
  returning id
)
insert into public.restaurant_settings (restaurant_id, meal_periods, admin_pin_hash)
select
  id,
  '[
    {"id":"breakfast","name":"早市","start":"07:00","end":"11:00"},
    {"id":"lunch","name":"午市","start":"11:00","end":"17:00"},
    {"id":"dinner","name":"晚市","start":"17:00","end":"23:59"}
  ]'::jsonb,
  null
from restaurant
on conflict (restaurant_id) do update
  set meal_periods = excluded.meal_periods,
      updated_at = now();

with restaurant as (
  select id from public.restaurants where slug = 'harbour-demo'
)
insert into public.printer_settings (restaurant_id, auto_print, sound, printer, copies)
select id, true, true, '廚房熱敏打印機', 1
from restaurant
on conflict (restaurant_id) do update
  set auto_print = excluded.auto_print,
      sound = excluded.sound,
      printer = excluded.printer,
      copies = excluded.copies,
      updated_at = now();

with restaurant as (
  select id from public.restaurants where slug = 'harbour-demo'
),
demo_tables (number, seats) as (
  values
    ('01', 4), ('02', 4), ('03', 4), ('04', 4),
    ('05', 4), ('06', 4), ('07', 4), ('08', 4),
    ('09', 4), ('10', 4), ('11', 4), ('12', 4)
)
insert into public.tables (restaurant_id, number, seats, active)
select restaurant.id, demo_tables.number, demo_tables.seats, true
from restaurant
cross join demo_tables
on conflict (restaurant_id, number) do update
  set seats = excluded.seats,
      active = excluded.active,
      updated_at = now();

with restaurant as (
  select id from public.restaurants where slug = 'harbour-demo'
),
demo_staff (name, role, active) as (
  values
    ('陳經理', 'manager', true),
    ('阿 May', 'cashier', true),
    ('阿強', 'floor', true)
)
insert into public.staff_members (restaurant_id, name, role, active)
select restaurant.id, demo_staff.name, demo_staff.role, demo_staff.active
from restaurant
cross join demo_staff
where not exists (
  select 1
  from public.staff_members staff
  where staff.restaurant_id = restaurant.id
    and staff.name = demo_staff.name
);

with restaurant as (
  select id from public.restaurants where slug = 'harbour-demo'
),
demo_menu (client_id, name, description, category, price_cents, image_path, sort_order) as (
  values
    ('char-siu', '蜜汁叉燒飯', '明爐叉燒、時蔬、香米飯', '飯類', 6800, 'char-siu.jpg', 1),
    ('roast-goose-rice', '燒鵝飯', '脆皮燒鵝、油香白飯、梅子醬', '飯類', 9800, 'roast-goose-rice.jpg', 2),
    ('soy-chicken-rice', '豉油雞飯', '嫩滑豉油雞、薑蔥、菜心', '飯類', 6200, 'soy-chicken-rice.jpg', 3),
    ('hainan-chicken-rice', '海南雞飯', '白切雞、雞油飯、三色醬', '飯類', 7200, 'hainan-chicken-rice.jpg', 4),
    ('beef-brisket-rice', '牛腩飯', '柱侯牛腩、蘿蔔、香米飯', '飯類', 7800, 'beef-brisket-rice.jpg', 5),
    ('curry-beef-rice', '咖喱牛腩飯', '港式咖喱、軟腍牛腩、薯仔', '飯類', 8200, 'curry-beef-rice.jpg', 6),
    ('tomato-porkchop-rice', '焗茄汁豬扒飯', '香煎豬扒、番茄汁、白飯', '飯類', 7600, 'tomato-porkchop-rice.jpg', 7),
    ('yangzhou-fried-rice', '揚州炒飯', '蝦仁、叉燒、雞蛋、青豆', '飯類', 6800, 'yangzhou-fried-rice.jpg', 8),
    ('seafood-fried-rice', '海鮮炒飯', '鮮蝦、帶子、魷魚、蛋香飯', '飯類', 8800, 'seafood-fried-rice.jpg', 9),
    ('claypot-eel-rice', '鰻魚煲仔飯', '蒲燒鰻魚、煲仔飯、甜豉油', '飯類', 10800, 'claypot-eel-rice.jpg', 10),
    ('shrimp-dumpling', '鮮蝦餃皇', '晶瑩薄皮，鮮蝦爽彈', '點心', 4200, 'shrimp-dumpling.jpg', 11),
    ('pork-siu-mai', '蟹籽燒賣', '豬肉鮮蝦、蟹籽點綴', '點心', 3800, 'pork-siu-mai.jpg', 12),
    ('bbq-pork-bun', '叉燒包', '鬆軟包皮、蜜汁叉燒餡', '點心', 3200, 'bbq-pork-bun.jpg', 13),
    ('custard-bun', '流沙奶皇包', '鹹蛋黃奶皇、熱食流心', '點心', 3600, 'custard-bun.jpg', 14),
    ('turnip-cake', '香煎蘿蔔糕', '臘味蘿蔔糕、外脆內軟', '點心', 3400, 'turnip-cake.jpg', 15),
    ('spring-roll', '脆皮春卷', '鮮蔬肉絲、香脆金黃', '點心', 3000, 'spring-roll.jpg', 16),
    ('rice-roll', '鮮蝦腸粉', '滑身腸粉、鮮蝦、甜豉油', '點心', 4600, 'rice-roll.jpg', 17),
    ('phoenix-claw', '豉汁鳳爪', '蒸至軟糯、豉汁入味', '點心', 3600, 'phoenix-claw.jpg', 18),
    ('spare-ribs', '豉汁蒸排骨', '蒜香豉汁、排骨嫩滑', '點心', 4200, 'spare-ribs.jpg', 19),
    ('xiao-long-bao', '小籠湯包', '薄皮湯汁、鮮肉餡', '點心', 4400, 'xiao-long-bao.jpg', 20),
    ('wonton-noodle', '鮮蝦雲吞麵', '竹昇細麵、鮮蝦雲吞、清湯', '麵類', 5600, 'wonton-noodle.jpg', 21),
    ('beef-brisket-noodle', '牛腩湯麵', '柱侯牛腩、清湯幼麵', '麵類', 6800, 'beef-brisket-noodle.jpg', 22),
    ('fishball-noodle', '魚蛋河粉', '彈牙魚蛋、滑身河粉', '麵類', 5200, 'fishball-noodle.jpg', 23),
    ('satay-beef-noodle', '沙嗲牛肉麵', '濃香沙嗲、嫩牛肉片', '麵類', 5800, 'satay-beef-noodle.jpg', 24),
    ('cart-noodle', '港式車仔麵', '多款配料、惹味湯底', '麵類', 4800, 'cart-noodle.jpg', 25),
    ('roast-goose-lai-fun', '燒鵝瀨粉', '燒鵝件、米香瀨粉', '麵類', 8800, 'roast-goose-lai-fun.jpg', 26),
    ('dry-scallion-noodle', '蔥油撈麵', '蔥油香、爽口竹昇麵', '麵類', 4600, 'dry-scallion-noodle.jpg', 27),
    ('seafood-laksa', '海鮮喇沙', '椰香湯底、鮮蝦魷魚', '麵類', 7800, 'seafood-laksa.jpg', 28),
    ('black-pepper-udon', '黑椒牛柳烏冬', '黑椒汁、牛柳、彈牙烏冬', '麵類', 8200, 'black-pepper-udon.jpg', 29),
    ('tomato-egg-noodle', '番茄蛋湯麵', '番茄湯底、滑蛋、幼麵', '麵類', 5000, 'tomato-egg-noodle.jpg', 30),
    ('stir-fried-beef', '時蔬炒牛肉', '鑊氣十足，牛肉嫩滑', '小菜', 8800, 'stir-fried-beef.jpg', 31),
    ('steamed-fish', '清蒸海上鮮', '蔥薑豉油，每日鮮魚供應', '小菜', 13800, 'steamed-fish.jpg', 32),
    ('sweet-sour-pork', '菠蘿咕嚕肉', '酸甜開胃、外脆內嫩', '小菜', 8600, 'sweet-sour-pork.jpg', 33),
    ('salt-pepper-squid', '椒鹽鮮魷', '椒鹽香脆、鮮魷彈牙', '小菜', 9800, 'salt-pepper-squid.jpg', 34),
    ('garlic-choi-sum', '蒜蓉菜心', '清甜菜心、蒜香惹味', '小菜', 4800, 'garlic-choi-sum.jpg', 35),
    ('claypot-tofu', '海鮮豆腐煲', '滑豆腐、海鮮、濃郁煲汁', '小菜', 9200, 'claypot-tofu.jpg', 36),
    ('typhoon-crab', '避風塘炒蟹', '蒜酥香辣、蟹肉鮮甜', '小菜', 18800, 'typhoon-crab.jpg', 37),
    ('black-bean-clams', '豉椒炒蜆', '豉椒鮮香、蜆肉飽滿', '小菜', 8800, 'black-bean-clams.jpg', 38),
    ('swiss-wings', '瑞士雞翼', '甜豉油滷香、雞翼入味', '小菜', 5800, 'swiss-wings.jpg', 39),
    ('mapo-tofu', '麻婆豆腐', '微辣惹味、豆腐嫩滑', '小菜', 6200, 'mapo-tofu.jpg', 40),
    ('mango-pomelo', '楊枝甘露', '香芒、柚子、西米，清甜順滑', '甜品', 3800, 'mango-pomelo.jpg', 41),
    ('egg-tart', '酥皮蛋撻', '牛油酥皮、嫩滑蛋香', '甜品', 1800, 'egg-tart.jpg', 42),
    ('coconut-pudding', '椰汁糕', '椰香濃郁、口感清爽', '甜品', 2800, 'coconut-pudding.jpg', 43),
    ('red-bean-soup', '陳皮紅豆沙', '紅豆綿密、陳皮清香', '甜品', 3200, 'red-bean-soup.jpg', 44),
    ('tofu-pudding', '薑汁豆腐花', '豆香細滑、薑汁微辣', '甜品', 3000, 'tofu-pudding.jpg', 45),
    ('sesame-soup', '芝麻糊', '黑芝麻香濃、熱食暖胃', '甜品', 3400, 'sesame-soup.jpg', 46),
    ('grass-jelly', '仙草涼粉', '清涼爽滑、配糖水', '甜品', 2600, 'grass-jelly.jpg', 47),
    ('mango-pancake', '芒果班戟', '鮮芒果、忌廉、薄班戟皮', '甜品', 4200, 'mango-pancake.jpg', 48),
    ('pineapple-bun', '菠蘿油', '香脆菠蘿包、厚切牛油', '甜品', 2400, 'pineapple-bun.jpg', 49),
    ('milk-tea-pudding', '奶茶布甸', '港式奶茶香、滑身布甸', '甜品', 3600, 'milk-tea-pudding.jpg', 50),
    ('hk-milk-tea', '港式奶茶', '茶味濃厚、奶香順滑', '飲品', 2200, 'hk-milk-tea.jpg', 51),
    ('lemon-tea', '凍檸茶', '紅茶清香、新鮮檸檬', '飲品', 2400, 'lemon-tea.jpg', 52),
    ('yuenyeung', '鴛鴦', '咖啡奶茶混合、港式經典', '飲品', 2500, 'yuenyeung.jpg', 53),
    ('lemon-coke', '凍檸樂', '可樂氣泡、檸檬清新', '飲品', 2400, 'lemon-coke.jpg', 54),
    ('red-bean-ice', '紅豆冰', '紅豆、淡奶、碎冰', '飲品', 3200, 'red-bean-ice.jpg', 55),
    ('soy-milk', '冰豆漿', '豆香清甜、冰涼解膩', '飲品', 1800, 'soy-milk.jpg', 56),
    ('chrysanthemum-tea', '菊花茶', '清香回甘、冷熱皆宜', '飲品', 1800, 'chrysanthemum-tea.jpg', 57),
    ('iced-coffee', '凍咖啡', '香濃咖啡、冰涼提神', '飲品', 2500, 'iced-coffee.jpg', 58),
    ('lime-soda', '青檸梳打', '青檸酸香、氣泡清爽', '飲品', 2800, 'lime-soda.jpg', 59),
    ('bottled-water', '樽裝水', '簡單清爽、佐餐必備', '飲品', 1200, 'bottled-water.jpg', 60)
)
insert into public.menu_items (
  restaurant_id,
  client_id,
  name,
  description,
  category,
  price_cents,
  image_path,
  meal_periods,
  sold_out,
  deleted,
  sort_order
)
select
  restaurant.id,
  demo_menu.client_id,
  demo_menu.name,
  demo_menu.description,
  demo_menu.category,
  demo_menu.price_cents,
  demo_menu.image_path,
  '{}'::text[],
  false,
  false,
  demo_menu.sort_order
from restaurant
cross join demo_menu
on conflict (restaurant_id, client_id) do update
  set name = excluded.name,
      description = excluded.description,
      category = excluded.category,
      price_cents = excluded.price_cents,
      image_path = excluded.image_path,
      meal_periods = excluded.meal_periods,
      sold_out = excluded.sold_out,
      deleted = excluded.deleted,
      sort_order = excluded.sort_order,
      updated_at = now();
