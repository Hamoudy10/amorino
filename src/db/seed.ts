import { db } from "../db";
import { categories, menuItems, users } from "../db/schema";
import { seedDefaultSettings } from "../lib/settings";
import { config } from "dotenv";

// Next.js loads .env.local automatically, but standalone scripts (tsx) do not.
config({ path: ".env.local" });

// Full menu as printed in the official "AMORINO CAFE — Food & Drinks Menu"
// (menu PDF). Prices in KES as printed.
const categoriesData = [
  { name: "Breakfast", slug: "breakfast", description: "Big coastal breakfasts, eggs any style and fresh sides — served all day.", sortOrder: 1, imageUrl: "/food/breakfast.jpg" },
  { name: "Snacks & Sandwiches", slug: "snacks", description: "Samosas, croissants, pies, chapati and hot sandwiches for the in-between cravings.", sortOrder: 2, imageUrl: "/food/snack.jpg" },
  { name: "Starters & Fries", slug: "starters", description: "Crispy fingers, wings and prawns with fries — perfect to share.", sortOrder: 3, imageUrl: "/food/starter.jpg" },
  { name: "Main Course Specials", slug: "specials", description: "Biryani, pilau, mandhi and liver — served with banana & salad.", sortOrder: 4, imageUrl: "/food/mandhi.jpg" },
  { name: "Pasta & Soups", slug: "pasta-soups", description: "Fresh pastas and hearty soups, from seafood to mushroom.", sortOrder: 5, imageUrl: "/food/pasta.jpg" },
  { name: "Salads & Curries", slug: "salads-curries", description: "Fresh salads and slow-cooked curries — chicken, mutton, fish & prawns.", sortOrder: 6, imageUrl: "/food/starter.jpg" },
  { name: "BBQ & Grills", slug: "bbq-grills", description: "Charcoal-grilled steaks and chops — the Amorino signature.", sortOrder: 7, imageUrl: "/food/steak.jpg" },
  { name: "Seafood", slug: "seafood", description: "Fresh from the Indian Ocean — fish, prawns, lobster and the famous platter.", sortOrder: 8, imageUrl: "/food/seafood.jpg" },
  { name: "Barbecue & Tikka", slug: "barbecue", description: "Chooza, tikka, kebabs and mshikaki grilled over open flame.", sortOrder: 9, imageUrl: "/food/tikka.jpg" },
  { name: "Burgers", slug: "burgers", description: "Beef, chicken, veggie and the loaded Amorino burger.", sortOrder: 10, imageUrl: "/food/burger.jpg" },
  { name: "Pizzas", slug: "pizzas", description: "Stone-baked pizzas, from classic Margherita to seafood.", sortOrder: 11, imageUrl: "/food/pizza.jpg" },
  { name: "Tea & Coffee", slug: "tea-coffee", description: "Kenyan tea, chai and a full specialty coffee bar — single or double.", sortOrder: 12, imageUrl: "/food/coffee.jpg" },
  { name: "Iced Drinks & Coolers", slug: "cold-drinks", description: "Iced teas, shaken iced coffees and frappes.", sortOrder: 13, imageUrl: "/food/iced.jpg" },
  { name: "Mocktails & Mojitos", slug: "mocktails", description: "Fresh fruit mocktails, mojitos and falooda.", sortOrder: 14, imageUrl: "/food/mocktail.jpg" },
  { name: "Smoothies & Shakes", slug: "shakes", description: "Thick shakes factory, smoothies and the famous freak shake.", sortOrder: 15, imageUrl: "/food/shake.jpg" },
  { name: "Juices & Soft Drinks", slug: "juices", description: "Fresh-pressed juices, sodas and water.", sortOrder: 16, imageUrl: "/food/juice.jpg" },
  { name: "Ice Cream & Fruit", slug: "desserts", description: "Scoops, fruit salads and sweet finishes.", sortOrder: 17, imageUrl: "/food/dessert.jpg" },
  { name: "Cakes", slug: "cakes", description: "Cakes by the slice or the whole kg — from Red Velvet to Kit Kat.", sortOrder: 18, imageUrl: "/food/cake.jpg" },
];

interface SeedItem {
  category: string;
  name: string;
  description: string;
  price: number;
  prepTime: number;
  isPopular?: boolean;
  isVegetarian?: boolean;
  isSpicy?: boolean;
  options?: { name: string; price: number }[];
}

const menuData: SeedItem[] = [
  // ---------- Breakfast ----------
  { category: "breakfast", name: "Breakfast Deluxe", description: "2 Eggs, sautéed mushrooms, 2 sausages, baked beans, beef bacon, toasted bread, grilled tomatoes & fruit salad.", price: 550, prepTime: 15, isPopular: true },
  { category: "breakfast", name: "Breakfast Amorino", description: "2 Eggs, 1 sausage, 1 samosa, 1 croissant, baked beans & toast.", price: 400, prepTime: 12 },
  { category: "breakfast", name: "Breakfast Simple", description: "2 Eggs with 2 slices of toasted bread.", price: 350, prepTime: 8 },
  { category: "breakfast", name: "Mutton Liver | Beef", description: "Served with pita bread.", price: 250, prepTime: 10, isSpicy: true, options: [{ name: "Mutton", price: 0 }, { name: "Beef", price: 0 }] },
  { category: "breakfast", name: "Muesli with Yoghurt", description: "Crispy muesli served with creamy yoghurt.", price: 350, prepTime: 3, isVegetarian: true },
  { category: "breakfast", name: "Pancakes (4 pcs)", description: "Fluffy pancakes with honey or syrup.", price: 300, prepTime: 10, isVegetarian: true },

  // ---------- Snacks & Sandwiches ----------
  { category: "snacks", name: "Chapati", description: "Soft layered chapati, made fresh.", price: 50, prepTime: 5, isVegetarian: true },
  { category: "snacks", name: "Samosa (3 pcs)", description: "Crispy beef samosas.", price: 200, prepTime: 6, isSpicy: true },
  { category: "snacks", name: "Kebabs (3 pcs)", description: "Spiced minced meat kebabs.", price: 200, prepTime: 8, isSpicy: true },
  { category: "snacks", name: "Plain Croissant", description: "Buttery, flaky croissant.", price: 170, prepTime: 2, isVegetarian: true },
  { category: "snacks", name: "Cheese Croissant", description: "Croissant baked with melted cheese.", price: 200, prepTime: 3, isVegetarian: true },
  { category: "snacks", name: "Choc Croissant", description: "Croissant filled with chocolate.", price: 200, prepTime: 3, isVegetarian: true },
  { category: "snacks", name: "Meat Pie", description: "Golden pastry filled with spiced meat.", price: 150, prepTime: 5 },
  { category: "snacks", name: "Chicken Pie", description: "Golden pastry filled with chicken.", price: 150, prepTime: 5 },
  { category: "snacks", name: "Doughnut", description: "Fresh, soft doughnut.", price: 100, prepTime: 3, isVegetarian: true },
  { category: "snacks", name: "Paparoti", description: "Crispy pan bread.", price: 200, prepTime: 5, isVegetarian: true },
  { category: "snacks", name: "Hotdog", description: "Grilled sausage in a soft bun.", price: 200, prepTime: 5 },
  { category: "snacks", name: "Boiled Eggs (2 pcs)", description: "Perfectly boiled eggs.", price: 80, prepTime: 5, isVegetarian: true },
  { category: "snacks", name: "Scrambled Eggs (Shakshuka)", description: "Shakshuka-style scrambled eggs.", price: 100, prepTime: 6, isVegetarian: true, isSpicy: true },
  { category: "snacks", name: "Spanish Omelette", description: "Thick Spanish omelette with potatoes.", price: 100, prepTime: 8, isVegetarian: true },
  { category: "snacks", name: "Chicken Sandwich", description: "Grilled chicken, veggies & house sauce.", price: 500, prepTime: 8 },
  { category: "snacks", name: "Beef Sandwich", description: "Sliced beef, cheese & veggies.", price: 500, prepTime: 8 },
  { category: "snacks", name: "Tuna Sandwich", description: "Tuna mayo with fresh veggies.", price: 600, prepTime: 8 },
  { category: "snacks", name: "Egg Sandwich", description: "Egg, cheese & veggies.", price: 350, prepTime: 6, isVegetarian: true },
  { category: "snacks", name: "Veggie Sandwich", description: "Loaded fresh vegetables & cheese.", price: 350, prepTime: 6, isVegetarian: true },
  { category: "snacks", name: "Toast Bread", description: "Buttered toasted bread.", price: 80, prepTime: 3, isVegetarian: true },
  { category: "snacks", name: "Garlic Bread", description: "Toasted bread with garlic butter.", price: 100, prepTime: 5, isVegetarian: true },

  // ---------- Starters & Fries ----------
  { category: "starters", name: "Fish Fingers (6 pcs)", description: "Crispy fish fingers with tartar sauce & fries.", price: 800, prepTime: 12, isPopular: true },
  { category: "starters", name: "Chicken Fingers (6 pcs)", description: "Golden chicken fingers with fries.", price: 700, prepTime: 12 },
  { category: "starters", name: "Chicken Wings (6 pcs)", description: "Sticky glazed wings with fries.", price: 700, prepTime: 12, isSpicy: true },
  { category: "starters", name: "Queen Prawns", description: "Butter-grilled queen prawns with fries.", price: 700, prepTime: 15, isSpicy: true },
  { category: "starters", name: "Calamari (6 pcs)", description: "Crispy calamari with tartar sauce & fries.", price: 1000, prepTime: 12 },
  { category: "starters", name: "Prawns Cocktail", description: "Chilled prawn cocktail, classic style.", price: 500, prepTime: 5 },
  { category: "starters", name: "Hummus with Pita Bread", description: "Creamy hummus served with warm pita.", price: 400, prepTime: 5, isVegetarian: true },
  { category: "starters", name: "Plain Fries", description: "Crispy golden fries.", price: 150, prepTime: 8, isVegetarian: true },
  { category: "starters", name: "Masala Fries", description: "Fries tossed in spicy masala.", price: 250, prepTime: 8, isVegetarian: true, isSpicy: true },
  { category: "starters", name: "Peri Peri Fries", description: "Fries dusted with peri peri.", price: 250, prepTime: 8, isVegetarian: true, isSpicy: true },
  { category: "starters", name: "Garlic Fries", description: "Fries with garlic butter & herbs.", price: 250, prepTime: 8, isVegetarian: true },
  { category: "starters", name: "Poussin Fries", description: "Fries served with poussin seasoning.", price: 250, prepTime: 10 },

  // ---------- Main Course Specials ----------
  { category: "specials", name: "Biryani (Mutton | Chicken | Veg)", description: "Fragrant spiced biryani. Served with banana & salad.", price: 500, prepTime: 25, isPopular: true, isSpicy: true, options: [{ name: "Mutton", price: 0 }, { name: "Chicken", price: 0 }, { name: "Vegetable", price: 0 }] },
  { category: "specials", name: "Pilau (Mutton | Chicken)", description: "Swahili pilau rice with tender meat. Served with banana & salad.", price: 500, prepTime: 20, isSpicy: true, options: [{ name: "Mutton", price: 0 }, { name: "Chicken", price: 0 }] },
  { category: "specials", name: "Mandhi Mutton", description: "Slow-cooked mutton over spiced mandi rice. Served with banana & salad.", price: 600, prepTime: 40, isPopular: true, isSpicy: true },
  { category: "specials", name: "Mandhi Chicken", description: "Our famous chicken mandi. Served with banana & salad.", price: 500, prepTime: 35, isPopular: true, isSpicy: true },
  { category: "specials", name: "Liver (Mutton | Beef)", description: "Grilled liver, served with banana & salad.", price: 350, prepTime: 15, options: [{ name: "Mutton", price: 0 }, { name: "Beef", price: 0 }] },
  { category: "specials", name: "Matumbo Mandhi", description: "Tender matumbo served mandi-style — per piece.", price: 50, prepTime: 15, isSpicy: true },

  // ---------- Pasta & Soups ----------
  { category: "pasta-soups", name: "Seafood Pasta", description: "Pasta tossed with prawns, calamari & creamy sauce.", price: 800, prepTime: 20, isPopular: true },
  { category: "pasta-soups", name: "Spaghetti Bolognese", description: "Classic bolognese with minced beef.", price: 400, prepTime: 15 },
  { category: "pasta-soups", name: "Vegetable Pasta", description: "Pasta with fresh seasonal vegetables.", price: 350, prepTime: 15, isVegetarian: true },
  { category: "pasta-soups", name: "Penne Arabiatta", description: "Penne in spicy tomato-arabiatta sauce.", price: 550, prepTime: 15, isVegetarian: true, isSpicy: true },
  { category: "pasta-soups", name: "Seafood Soup", description: "Rich soup with fresh seafood.", price: 500, prepTime: 15 },
  { category: "pasta-soups", name: "Mushroom Soup", description: "Creamy mushroom soup.", price: 350, prepTime: 10, isVegetarian: true },
  { category: "pasta-soups", name: "Vegetable Soup", description: "Light, fresh vegetable broth.", price: 350, prepTime: 10, isVegetarian: true },
  { category: "pasta-soups", name: "Tomato Soup", description: "Classic creamy tomato soup.", price: 350, prepTime: 10, isVegetarian: true },
  { category: "pasta-soups", name: "Beef Soup", description: "Hearty beef broth with vegetables.", price: 450, prepTime: 20 },

  // ---------- Salads & Curries ----------
  { category: "salads-curries", name: "Seafood Salad", description: "Fresh greens with prawns & calamari.", price: 700, prepTime: 10 },
  { category: "salads-curries", name: "Chicken Salad", description: "Grilled chicken over fresh salad.", price: 400, prepTime: 10 },
  { category: "salads-curries", name: "Mixed Salad", description: "Garden-fresh mixed salad.", price: 400, prepTime: 8, isVegetarian: true },
  { category: "salads-curries", name: "Tuna Salad", description: "Tuna with crisp greens & dressing.", price: 450, prepTime: 8 },
  { category: "salads-curries", name: "Chicken Curry", description: "Slow-cooked chicken curry with rice.", price: 600, prepTime: 20, isSpicy: true },
  { category: "salads-curries", name: "Mutton Curry", description: "Tender mutton in rich coastal curry.", price: 600, prepTime: 30, isSpicy: true },
  { category: "salads-curries", name: "Fish Curry", description: "Fresh fish in coconut curry.", price: 650, prepTime: 20, isSpicy: true },
  { category: "salads-curries", name: "Prawns Curry", description: "Prawns in creamy spiced curry.", price: 700, prepTime: 20, isSpicy: true },
  { category: "salads-curries", name: "Vegetable Curry", description: "Seasonal vegetables in mild curry.", price: 500, prepTime: 15, isVegetarian: true },

  // ---------- BBQ & Grills ----------
  { category: "bbq-grills", name: "T-Bone Steak", description: "Char-grilled T-bone served with fries.", price: 1200, prepTime: 30, isPopular: true, isSpicy: true },
  { category: "bbq-grills", name: "Lambchops", description: "Grilled lamb chops, juicy & charred.", price: 1200, prepTime: 25, isPopular: true },
  { category: "bbq-grills", name: "Pepper Steak", description: "Steak crusted with cracked pepper.", price: 950, prepTime: 25, isSpicy: true },
  { category: "bbq-grills", name: "Mushroom Fillet Steak", description: "Fillet steak with creamy mushroom sauce.", price: 1200, prepTime: 25 },
  { category: "bbq-grills", name: "Boneless Chicken", description: "Char-grilled boneless chicken breast.", price: 600, prepTime: 20 },
  { category: "bbq-grills", name: "Mushroom Chicken Breast", description: "Chicken breast in mushroom sauce.", price: 850, prepTime: 20 },
  { category: "bbq-grills", name: "Camel Steak", description: "Exotic camel steak, grilled medium.", price: 950, prepTime: 30 },
  { category: "bbq-grills", name: "Chips Shawarma", description: "Fries topped with shawarma meat & sauce.", price: 400, prepTime: 10, isSpicy: true },
  { category: "bbq-grills", name: "Mixed Grilled Platter", description: "Chicken skewer, 3 lamb chops, kebab & chicken breast — for sharing.", price: 3400, prepTime: 35, isPopular: true },
  { category: "bbq-grills", name: "Chicken Poussin", description: "Whole grilled spring chicken, special style.", price: 1400, prepTime: 35, isPopular: true },
  { category: "bbq-grills", name: "Chicken Brost", description: "Crispy broasted chicken, signature style.", price: 1500, prepTime: 30 },

  // ---------- Seafood ----------
  { category: "seafood", name: "Grilled Fish Fillet", description: "Fresh fillet char-grilled with coastal spices.", price: 850, prepTime: 20, isPopular: true },
  { category: "seafood", name: "Whole Fish", description: "Whole fish grilled to order.", price: 850, prepTime: 25, isSpicy: true },
  { category: "seafood", name: "Pan Fried Fish", description: "Butter pan-fried fish fillet.", price: 700, prepTime: 18 },
  { category: "seafood", name: "Hubs Crushed Fish", description: "Crushed-spice coated fried fish.", price: 850, prepTime: 20, isSpicy: true },
  { category: "seafood", name: "Grilled Lobster", description: "Butter-grilled lobster tail.", price: 1600, prepTime: 30, isPopular: true },
  { category: "seafood", name: "Lobster Thermidor", description: "Lobster in creamy thermidor sauce.", price: 1700, prepTime: 35 },
  { category: "seafood", name: "Lobster Creole", description: "Lobster in Creole-style tomato sauce.", price: 1600, prepTime: 35, isSpicy: true },
  { category: "seafood", name: "Grilled King Prawns", description: "Jumbo king prawns, garlic butter.", price: 1100, prepTime: 20 },
  { category: "seafood", name: "Prawn Skewers", description: "Chargrilled prawn skewers.", price: 900, prepTime: 18 },
  { category: "seafood", name: "Grilled King Fish", description: "King fish steak grilled to order.", price: 850, prepTime: 20 },
  { category: "seafood", name: "Grilled Calamari", description: "Char-grilled calamari tubes.", price: 1200, prepTime: 18 },
  { category: "seafood", name: "Seafood Platter", description: "Fillet, calamari, king prawns, lobster & octopus — the showstopper.", price: 3500, prepTime: 40, isPopular: true },

  // ---------- Barbecue & Tikka ----------
  { category: "barbecue", name: "Chicken Chooza", description: "Full spring chicken (1kg), grilled signature style.", price: 1300, prepTime: 35, isPopular: true },
  { category: "barbecue", name: "Chicken Tikka Breast", description: "Tandoori-marinated chicken breast.", price: 350, prepTime: 15, isSpicy: true },
  { category: "barbecue", name: "Chicken Tikka Leg", description: "Tandoori-marinated chicken leg.", price: 300, prepTime: 15, isSpicy: true },
  { category: "barbecue", name: "Chicken Malai Bott", description: "Creamy malai-marinated chicken.", price: 700, prepTime: 25 },
  { category: "barbecue", name: "Chicken Bott", description: "Grilled chicken quarter.", price: 600, prepTime: 20 },
  { category: "barbecue", name: "Mshikaki (4 sticks | plate)", description: "Coastal beef mshikaki skewers.", price: 350, prepTime: 15, isSpicy: true },
  { category: "barbecue", name: "Shish Kebab (3 sticks | plate)", description: "Minced meat shish kebabs.", price: 350, prepTime: 15, isSpicy: true },
  { category: "barbecue", name: "Chicken Kebab (3 sticks | plate)", description: "Spiced chicken kebabs.", price: 400, prepTime: 15, isSpicy: true },
  { category: "barbecue", name: "Behar Kebab (2 sticks | plate)", description: "Behar-style spiced kebabs.", price: 450, prepTime: 15, isSpicy: true },
  { category: "barbecue", name: "Kima Chapati", description: "Minced meat wrapped in chapati.", price: 200, prepTime: 10, isSpicy: true, options: [{ name: "Single", price: 0 }, { name: "Double", price: 50 }] },
  { category: "barbecue", name: "Veg Chapati", description: "Vegetable-stuffed chapati roll.", price: 150, prepTime: 10, isVegetarian: true, options: [{ name: "Single", price: 0 }, { name: "Double", price: 50 }] },
  { category: "barbecue", name: "Chicken Shawarma", description: "Classic chicken shawarma wrap.", price: 250, prepTime: 8, isPopular: true, isSpicy: true },
  { category: "barbecue", name: "Boneless Tikka", description: "Boneless chicken tikka pieces.", price: 500, prepTime: 15, isSpicy: true },
  { category: "barbecue", name: "Fish Tikka", description: "Spiced fish tikka pieces.", price: 800, prepTime: 15, isSpicy: true },
  { category: "barbecue", name: "Paneer Tikka", description: "Grilled paneer cubes in spices.", price: 500, prepTime: 15, isVegetarian: true, isSpicy: true },
  { category: "barbecue", name: "Potato Wedges", description: "Crispy seasoned wedges.", price: 250, prepTime: 10, isVegetarian: true },
  { category: "barbecue", name: "Mashed Potatoes", description: "Creamy mashed potatoes.", price: 250, prepTime: 10, isVegetarian: true },
  { category: "barbecue", name: "Pita Bread", description: "Warm soft pita.", price: 80, prepTime: 3, isVegetarian: true },
  { category: "barbecue", name: "Vegetable Rice", description: "Fluffy seasoned vegetable rice.", price: 250, prepTime: 10, isVegetarian: true },
  { category: "barbecue", name: "White Rice", description: "Steamed white rice.", price: 200, prepTime: 10, isVegetarian: true },
  { category: "barbecue", name: "Sima (Ugali)", description: "Fresh ugali, the coastal staple.", price: 150, prepTime: 8, isVegetarian: true },

  // ---------- Burgers ----------
  { category: "burgers", name: "Amorino Burger", description: "Our loaded signature — double beef, cheese, egg & house sauce.", price: 700, prepTime: 15, isPopular: true },
  { category: "burgers", name: "Beef Burger", description: "Char-grilled beef patty, cheese, lettuce & tomato.", price: 480, prepTime: 12, isPopular: true },
  { category: "burgers", name: "Chicken Burger", description: "Crispy or grilled chicken, cheese & slaw.", price: 450, prepTime: 12 },
  { category: "burgers", name: "Veggie Burger", description: "Grilled veggie patty, cheese & fresh veggies.", price: 400, prepTime: 12, isVegetarian: true },

  // ---------- Pizzas ----------
  { category: "pizzas", name: "Margherita", description: "Tomato, mozzarella & basil.", price: 600, prepTime: 15, isVegetarian: true },
  { category: "pizzas", name: "Peri Peri Chicken", description: "Spicy peri peri chicken, peppers & cheese.", price: 900, prepTime: 18, isPopular: true, isSpicy: true },
  { category: "pizzas", name: "Seafood Pizza", description: "Prawns, calamari & seafood sauce.", price: 1200, prepTime: 20, isPopular: true },
  { category: "pizzas", name: "Hawaiian", description: "Ham & pineapple, classic combo.", price: 650, prepTime: 15 },
  { category: "pizzas", name: "Tuna Pizza", description: "Tuna, onions & mozzarella.", price: 800, prepTime: 15 },
  { category: "pizzas", name: "Milano", description: "Pepperoni-style special with herbs.", price: 680, prepTime: 15 },

  // ---------- Tea & Coffee ----------
  { category: "tea-coffee", name: "Black Tea", description: "Freshly brewed Kenyan black tea.", price: 100, prepTime: 3, isVegetarian: true },
  { category: "tea-coffee", name: "Milk Tea", description: "Hot milk tea.", price: 120, prepTime: 3, isVegetarian: true },
  { category: "tea-coffee", name: "Regular Tea", description: "The classic cup of chai.", price: 120, prepTime: 3, isVegetarian: true },
  { category: "tea-coffee", name: "Green Tea", description: "Pure green tea.", price: 120, prepTime: 3, isVegetarian: true },
  { category: "tea-coffee", name: "Masala Tea", description: "Spiced masala chai, the coastal way.", price: 150, prepTime: 5, isVegetarian: true, isPopular: true },
  { category: "tea-coffee", name: "Lemon Tea", description: "Tea with fresh lemon.", price: 120, prepTime: 3, isVegetarian: true },
  { category: "tea-coffee", name: "Peppermint Tea", description: "Cooling peppermint infusion.", price: 120, prepTime: 3, isVegetarian: true },
  { category: "tea-coffee", name: "Lemon Ginger Tea", description: "Zesty lemon & ginger tea.", price: 120, prepTime: 4, isVegetarian: true },
  { category: "tea-coffee", name: "Hot Chocolate", description: "Rich hot chocolate.", price: 180, prepTime: 5, isVegetarian: true },
  { category: "tea-coffee", name: "Hot Choco Nutella (Deluxe)", description: "Hot chocolate made with Nutella.", price: 250, prepTime: 6, isVegetarian: true },
  { category: "tea-coffee", name: "Hot Dawa", description: "Coastal herbal dawa.", price: 200, prepTime: 5, isVegetarian: true },
  { category: "tea-coffee", name: "Camel Milk Tea", description: "Tea brewed with camel milk.", price: 120, prepTime: 4, isVegetarian: true },
  { category: "tea-coffee", name: "Espresso", description: "Freshly pulled double shot.", price: 120, prepTime: 3, isVegetarian: true, options: [{ name: "Single", price: 0 }, { name: "Double", price: 30 }] },
  { category: "tea-coffee", name: "Americano", description: "Espresso with hot water.", price: 150, prepTime: 4, isVegetarian: true, options: [{ name: "Single", price: 0 }, { name: "Double", price: 30 }] },
  { category: "tea-coffee", name: "Café Latte", description: "Smooth espresso & steamed milk.", price: 180, prepTime: 5, isVegetarian: true, isPopular: true, options: [{ name: "Single", price: 0 }, { name: "Double", price: 100 }] },
  { category: "tea-coffee", name: "Cappuccino", description: "Espresso, milk & thick foam.", price: 180, prepTime: 5, isVegetarian: true, options: [{ name: "Single", price: 0 }, { name: "Double", price: 50 }] },
  { category: "tea-coffee", name: "Mocha", description: "Espresso, chocolate & milk.", price: 200, prepTime: 5, isVegetarian: true, options: [{ name: "Single", price: 0 }, { name: "Double", price: 50 }] },
  { category: "tea-coffee", name: "Flat White", description: "Double espresso with velvety milk.", price: 180, prepTime: 5, isVegetarian: true, options: [{ name: "Single", price: 0 }, { name: "Double", price: 70 }] },
  { category: "tea-coffee", name: "Machiatto", description: "Espresso with a dash of milk foam.", price: 150, prepTime: 4, isVegetarian: true, options: [{ name: "Single", price: 0 }, { name: "Double", price: 20 }] },
  { category: "tea-coffee", name: "Spanish Latte", description: "Latte sweetened with condensed milk.", price: 200, prepTime: 5, isVegetarian: true, isPopular: true, options: [{ name: "Single", price: 0 }, { name: "Double", price: 50 }] },
  { category: "tea-coffee", name: "Dolce Latte (Cinnamon)", description: "Cinnamon-spiced latte.", price: 230, prepTime: 5, isVegetarian: true, options: [{ name: "Single", price: 0 }, { name: "Double", price: 70 }] },
  { category: "tea-coffee", name: "Blonde Latte (Vanilla)", description: "Vanilla blonde latte.", price: 230, prepTime: 5, isVegetarian: true, options: [{ name: "Single", price: 0 }, { name: "Double", price: 70 }] },
  { category: "tea-coffee", name: "Toffee Latte", description: "Sweet toffee latte.", price: 230, prepTime: 5, isVegetarian: true, options: [{ name: "Single", price: 0 }, { name: "Double", price: 70 }] },

  // ---------- Iced Drinks & Coolers ----------
  { category: "cold-drinks", name: "Iced Tea (Hibiscus | Strawberry)", description: "Chilled hibiscus or strawberry iced tea.", price: 300, prepTime: 5, isVegetarian: true, options: [{ name: "Hibiscus", price: 0 }, { name: "Strawberry", price: 0 }] },
  { category: "cold-drinks", name: "Iced Tea (Lemon & Lime)", description: "Fresh lemon & lime iced tea.", price: 300, prepTime: 5, isVegetarian: true },
  { category: "cold-drinks", name: "Iced Tea (Peach)", description: "Peach-infused iced tea.", price: 300, prepTime: 5, isVegetarian: true },
  { category: "cold-drinks", name: "Iced Spanish Latte", description: "Spanish latte over ice.", price: 350, prepTime: 5, isVegetarian: true, isPopular: true },
  { category: "cold-drinks", name: "Iced Latte", description: "Smooth iced latte.", price: 300, prepTime: 5, isVegetarian: true },
  { category: "cold-drinks", name: "Iced Cappuccino", description: "Iced cappuccino, layered.", price: 300, prepTime: 5, isVegetarian: true },
  { category: "cold-drinks", name: "Iced Americano", description: "Chilled americano.", price: 250, prepTime: 4, isVegetarian: true },
  { category: "cold-drinks", name: "Iced Mocha", description: "Chocolate mocha over ice.", price: 300, prepTime: 5, isVegetarian: true },
  { category: "cold-drinks", name: "Iced Chocolate", description: "Chilled rich chocolate.", price: 260, prepTime: 5, isVegetarian: true },
  { category: "cold-drinks", name: "Mocha Cookie Cooler", description: "Mocha, cookie crumble & cream.", price: 480, prepTime: 6, isVegetarian: true, isPopular: true },
  { category: "cold-drinks", name: "Coffee Cream | Coffee Toffee", description: "Blended cream or toffee coffee cooler.", price: 480, prepTime: 6, isVegetarian: true, options: [{ name: "Coffee Cream", price: 0 }, { name: "Coffee Toffee", price: 0 }] },
  { category: "cold-drinks", name: "Caramel Frappe", description: "Blended caramel frappe.", price: 480, prepTime: 6, isVegetarian: true },
  { category: "cold-drinks", name: "Vanilla Frappe", description: "Blended vanilla frappe.", price: 480, prepTime: 6, isVegetarian: true },

  // ---------- Mocktails & Mojitos ----------
  { category: "mocktails", name: "Green Sea", description: "Refreshing signature green mocktail.", price: 400, prepTime: 5, isVegetarian: true, isPopular: true },
  { category: "mocktails", name: "Sunrise", description: "Sunset-layered citrus mocktail.", price: 400, prepTime: 5, isVegetarian: true },
  { category: "mocktails", name: "Arizona Sunset", description: "Peach & citrus sunset blend.", price: 400, prepTime: 5, isVegetarian: true },
  { category: "mocktails", name: "Paradise", description: "Tropical paradise in a glass.", price: 400, prepTime: 5, isVegetarian: true },
  { category: "mocktails", name: "Lemon & Mint", description: "Zesty lemon with fresh mint.", price: 350, prepTime: 4, isVegetarian: true },
  { category: "mocktails", name: "Pine & Mint", description: "Pineapple & mint crush.", price: 350, prepTime: 4, isVegetarian: true },
  { category: "mocktails", name: "Strawberry Lemonade", description: "Fresh strawberry lemonade.", price: 400, prepTime: 4, isVegetarian: true },
  { category: "mocktails", name: "Piña Colada (Virgin)", description: "Creamy coconut-pineapple colada.", price: 400, prepTime: 5, isVegetarian: true },
  { category: "mocktails", name: "Virgin Sangria", description: "Fruit-infused sangria, no alcohol.", price: 400, prepTime: 5, isVegetarian: true },
  { category: "mocktails", name: "Cold Dawa", description: "Chilled coastal dawa.", price: 200, prepTime: 4, isVegetarian: true },
  { category: "mocktails", name: "Mojito", description: "Fresh mojito — choose your fruit: apple, grapes, vimto, watermelon, green sea, blue mist, passion, kiwi, mixed berries, lemon, lemon & mint, orange, peach or blueberry.", price: 400, prepTime: 5, isVegetarian: true, isPopular: true, options: [{ name: "Classic Lemon", price: 0 }, { name: "Apple", price: 0 }, { name: "Grapes", price: 0 }, { name: "Vimto", price: 0 }, { name: "Watermelon", price: 0 }, { name: "Green Sea", price: 0 }, { name: "Blue Mist", price: 0 }, { name: "Passion", price: 0 }, { name: "Kiwi", price: 0 }, { name: "Mixed Berries", price: 0 }, { name: "Lemon & Mint", price: 0 }, { name: "Orange", price: 0 }, { name: "Peach", price: 0 }, { name: "Blueberry", price: 0 }] },
  { category: "mocktails", name: "Falooda (Pista)", description: "Sweet falooda with pistachio.", price: 600, prepTime: 5, isVegetarian: true },
  { category: "mocktails", name: "Falooda (Strawberry)", description: "Sweet falooda with strawberry.", price: 600, prepTime: 5, isVegetarian: true },
  { category: "mocktails", name: "Falooda (Vanilla)", description: "Sweet falooda with vanilla.", price: 600, prepTime: 5, isVegetarian: true },

  // ---------- Smoothies & Shakes ----------
  { category: "shakes", name: "Smoothie (Mango | Pineapple)", description: "Thick fresh fruit smoothie.", price: 380, prepTime: 5, isVegetarian: true, options: [{ name: "Mango", price: 0 }, { name: "Pineapple", price: 0 }] },
  { category: "shakes", name: "Smoothie (Strawberry | Blueberry)", description: "Thick berry smoothie.", price: 380, prepTime: 5, isVegetarian: true, options: [{ name: "Strawberry", price: 0 }, { name: "Blueberry", price: 0 }] },
  { category: "shakes", name: "Smoothie (Banana | Mixed Berry)", description: "Creamy banana or mixed berry.", price: 380, prepTime: 5, isVegetarian: true, options: [{ name: "Banana", price: 0 }, { name: "Mixed Berry", price: 0 }] },
  { category: "shakes", name: "Smoothie (Tropical | Passion)", description: "Tropical or passion fruit smoothie.", price: 380, prepTime: 5, isVegetarian: true, options: [{ name: "Tropical", price: 0 }, { name: "Passion", price: 0 }] },
  { category: "shakes", name: "Vanilla Shake", description: "Classic vanilla shake.", price: 400, prepTime: 5, isVegetarian: true },
  { category: "shakes", name: "Strawberry Shake", description: "Fresh strawberry shake.", price: 400, prepTime: 5, isVegetarian: true },
  { category: "shakes", name: "Chocolate Shake", description: "Rich chocolate shake.", price: 400, prepTime: 5, isVegetarian: true, isPopular: true },
  { category: "shakes", name: "Toffee Nuts Shake", description: "Toffee & nuts blended thick.", price: 350, prepTime: 5, isVegetarian: true },
  { category: "shakes", name: "Classic Oreo Shake", description: "Crushed Oreo shake.", price: 480, prepTime: 5, isVegetarian: true },
  { category: "shakes", name: "Choco Oreo Shake", description: "Chocolate + Oreo shake.", price: 480, prepTime: 5, isVegetarian: true },
  { category: "shakes", name: "Snickers Blast", description: "Snickers & caramel shake.", price: 480, prepTime: 5, isVegetarian: true },
  { category: "shakes", name: "Kit Kat Shake", description: "Kit Kat blended shake.", price: 480, prepTime: 5, isVegetarian: true },
  { category: "shakes", name: "Mars Shake", description: "Mars bar shake.", price: 450, prepTime: 5, isVegetarian: true },
  { category: "shakes", name: "Ferrero Rocher Shake", description: "Ferrero Rocher shake.", price: 480, prepTime: 5, isVegetarian: true, isPopular: true },
  { category: "shakes", name: "Lotus Shake", description: "Lotus biscuit shake.", price: 480, prepTime: 5, isVegetarian: true },
  { category: "shakes", name: "Kinder Bueno Shake", description: "Kinder Bueno shake.", price: 450, prepTime: 5, isVegetarian: true },
  { category: "shakes", name: "Double Chocolate Shake", description: "Double chocolate indulgence.", price: 400, prepTime: 5, isVegetarian: true },
  { category: "shakes", name: "Naughty Nutella Shake", description: "Nutella-packed shake.", price: 450, prepTime: 5, isVegetarian: true },
  { category: "shakes", name: "Death by Chocolate", description: "The ultimate chocolate shake.", price: 525, prepTime: 6, isVegetarian: true },
  { category: "shakes", name: "Call Me Saffron", description: "Saffron-scented shake.", price: 450, prepTime: 5, isVegetarian: true },
  { category: "shakes", name: "Caramel Shake", description: "Smooth caramel shake.", price: 525, prepTime: 5, isVegetarian: true },
  { category: "shakes", name: "Blueberry Shake", description: "Fresh blueberry shake.", price: 525, prepTime: 5, isVegetarian: true },
  { category: "shakes", name: "Dates | Rose Shake", description: "Dates or rose-flavoured shake.", price: 400, prepTime: 5, isVegetarian: true, options: [{ name: "Dates", price: 0 }, { name: "Rose", price: 0 }] },
  { category: "shakes", name: "Banana | Mango Shake", description: "Banana or mango shake.", price: 400, prepTime: 5, isVegetarian: true, options: [{ name: "Banana", price: 0 }, { name: "Mango", price: 0 }] },
  { category: "shakes", name: "Tropical | Avocado Shake", description: "Tropical or avocado shake.", price: 400, prepTime: 5, isVegetarian: true, options: [{ name: "Tropical", price: 0 }, { name: "Avocado", price: 0 }] },
  { category: "shakes", name: "Freak Shake", description: "The legendary loaded freak shake.", price: 750, prepTime: 8, isVegetarian: true, isPopular: true },

  // ---------- Juices & Soft Drinks ----------
  { category: "juices", name: "Orange Juice", description: "Fresh-pressed orange.", price: 200, prepTime: 3, isVegetarian: true },
  { category: "juices", name: "Pineapple Juice", description: "Fresh pineapple juice.", price: 200, prepTime: 3, isVegetarian: true },
  { category: "juices", name: "Mango Juice", description: "Sweet fresh mango juice.", price: 200, prepTime: 3, isVegetarian: true },
  { category: "juices", name: "Lemonade", description: "Classic fresh lemonade.", price: 200, prepTime: 3, isVegetarian: true },
  { category: "juices", name: "Vimto", description: "Chilled Vimto.", price: 200, prepTime: 2, isVegetarian: true },
  { category: "juices", name: "Passion Juice", description: "Tangy fresh passion fruit.", price: 200, prepTime: 3, isVegetarian: true },
  { category: "juices", name: "Watermelon Juice", description: "Fresh watermelon juice.", price: 200, prepTime: 3, isVegetarian: true },
  { category: "juices", name: "Hibiscus Juice", description: "Chilled hibiscus (sour) juice.", price: 200, prepTime: 3, isVegetarian: true },
  { category: "juices", name: "Avocado Juice", description: "Creamy avocado juice.", price: 200, prepTime: 3, isVegetarian: true },
  { category: "juices", name: "Tamarind Juice", description: "Sweet-sour tamarind juice.", price: 200, prepTime: 3, isVegetarian: true },
  { category: "juices", name: "Tropical Mint", description: "Tropical fruit with fresh mint.", price: 250, prepTime: 3, isVegetarian: true },
  { category: "juices", name: "Bungo", description: "The coastal favourite.", price: 250, prepTime: 3, isVegetarian: true },
  { category: "juices", name: "Mineral Water 500ml", description: "Chilled mineral water.", price: 100, prepTime: 1, isVegetarian: true },
  { category: "juices", name: "Mineral Water 1L", description: "Chilled mineral water 1 litre.", price: 150, prepTime: 1, isVegetarian: true },
  { category: "juices", name: "Soda", description: "Chilled bottled soda.", price: 100, prepTime: 1, isVegetarian: true },

  // ---------- Ice Cream & Fruit ----------
  { category: "desserts", name: "Vanilla Ice Cream", description: "Scoop of vanilla.", price: 100, prepTime: 2, isVegetarian: true },
  { category: "desserts", name: "Strawberry Ice Cream", description: "Scoop of strawberry.", price: 100, prepTime: 2, isVegetarian: true },
  { category: "desserts", name: "Chocolate Ice Cream", description: "Scoop of chocolate.", price: 100, prepTime: 2, isVegetarian: true },
  { category: "desserts", name: "Pistachio Ice Cream", description: "Scoop of pistachio.", price: 100, prepTime: 2, isVegetarian: true },
  { category: "desserts", name: "Plain Fruit Salad", description: "Fresh cut seasonal fruit.", price: 200, prepTime: 4, isVegetarian: true },
  { category: "desserts", name: "Scud Fruit Salad", description: "Fruit salad with a twist.", price: 200, prepTime: 4, isVegetarian: true },
  { category: "desserts", name: "VIP Scud", description: "The deluxe fruit salad special.", price: 300, prepTime: 5, isVegetarian: true },

  // ---------- Cakes ----------
  { category: "cakes", name: "Vanilla Cake", description: "Classic vanilla layer cake.", price: 200, prepTime: 2, isVegetarian: true, options: [{ name: "Slice", price: 0 }, { name: "Whole (per kg)", price: 1300 }] },
  { category: "cakes", name: "Chocolate Cake", description: "Rich chocolate layer cake.", price: 270, prepTime: 2, isVegetarian: true, isPopular: true, options: [{ name: "Slice", price: 0 }, { name: "Whole (per kg)", price: 1530 }] },
  { category: "cakes", name: "Fudge Cake", description: "Dense chocolate fudge cake.", price: 270, prepTime: 2, isVegetarian: true, options: [{ name: "Slice", price: 0 }, { name: "Whole (per kg)", price: 1430 }] },
  { category: "cakes", name: "Black Forest", description: "Cherry-chocolate classic.", price: 350, prepTime: 2, isVegetarian: true, options: [{ name: "Slice", price: 0 }, { name: "Whole (per kg)", price: 2050 }] },
  { category: "cakes", name: "White Forest", description: "Vanilla-cream forest cake.", price: 350, prepTime: 2, isVegetarian: true, options: [{ name: "Slice", price: 0 }, { name: "Whole (per kg)", price: 2050 }] },
  { category: "cakes", name: "Tiramisu", description: "Coffee-laced tiramisu.", price: 300, prepTime: 2, isVegetarian: true, options: [{ name: "Slice", price: 0 }, { name: "Whole (per kg)", price: 2100 }] },
  { category: "cakes", name: "Fruit Gatovex", description: "Layered fruit cake.", price: 300, prepTime: 2, isVegetarian: true, options: [{ name: "Slice", price: 0 }, { name: "Whole (per kg)", price: 2100 }] },
  { category: "cakes", name: "Blueberry Cheesecake", description: "Creamy blueberry cheesecake.", price: 350, prepTime: 2, isVegetarian: true, options: [{ name: "Slice", price: 0 }, { name: "Whole (per kg)", price: 2050 }] },
  { category: "cakes", name: "Mango Cheesecake", description: "Fresh mango cheesecake.", price: 350, prepTime: 2, isVegetarian: true, options: [{ name: "Slice", price: 0 }, { name: "Whole (per kg)", price: 2050 }] },
  { category: "cakes", name: "Strawberry Cheesecake", description: "Strawberry cheesecake.", price: 350, prepTime: 2, isVegetarian: true, options: [{ name: "Slice", price: 0 }, { name: "Whole (per kg)", price: 2050 }] },
  { category: "cakes", name: "Lemon Cheesecake", description: "Tangy lemon cheesecake.", price: 350, prepTime: 2, isVegetarian: true, options: [{ name: "Slice", price: 0 }, { name: "Whole (per kg)", price: 1350 }] },
  { category: "cakes", name: "Dates Apple Cake", description: "Dates & apple cake.", price: 270, prepTime: 2, isVegetarian: true, options: [{ name: "Slice", price: 0 }, { name: "Whole (per kg)", price: 2130 }] },
  { category: "cakes", name: "Kit Kat Cake", description: "Kit Kat-topped celebration cake.", price: 350, prepTime: 2, isVegetarian: true, options: [{ name: "Slice", price: 0 }, { name: "Whole (per kg)", price: 1650 }] },
  { category: "cakes", name: "Oreo Cake", description: "Cookies & cream cake.", price: 350, prepTime: 2, isVegetarian: true, options: [{ name: "Slice", price: 0 }, { name: "Whole (per kg)", price: 1350 }] },
  { category: "cakes", name: "Strawberry Sponge Cake", description: "Light strawberry sponge.", price: 270, prepTime: 2, isVegetarian: true, options: [{ name: "Slice", price: 0 }, { name: "Whole (per kg)", price: 1430 }] },
  { category: "cakes", name: "Pineapple Upside Down", description: "Caramelized pineapple cake.", price: 270, prepTime: 2, isVegetarian: true, options: [{ name: "Slice", price: 0 }, { name: "Whole (per kg)", price: 1430 }] },
  { category: "cakes", name: "Chocolate Mousse Cake", description: "Silky chocolate mousse cake.", price: 270, prepTime: 2, isVegetarian: true, options: [{ name: "Slice", price: 0 }, { name: "Whole (per kg)", price: 1430 }] },
  { category: "cakes", name: "Red Velvet Cake", description: "Velvety red velvet & cream cheese.", price: 270, prepTime: 2, isVegetarian: true, isPopular: true, options: [{ name: "Slice", price: 0 }, { name: "Whole (per kg)", price: 1730 }] },
  { category: "cakes", name: "Walnut Cake", description: "Crunchy walnut cake.", price: 270, prepTime: 2, isVegetarian: true, options: [{ name: "Slice", price: 0 }, { name: "Whole (per kg)", price: 1430 }] },
  { category: "cakes", name: "Carrot Cake", description: "Spiced carrot & walnut cake.", price: 270, prepTime: 2, isVegetarian: true, options: [{ name: "Slice", price: 0 }, { name: "Whole (per kg)", price: 1430 }] },
  { category: "cakes", name: "Banana Cake", description: "Moist banana cake.", price: 270, prepTime: 2, isVegetarian: true, options: [{ name: "Slice", price: 0 }, { name: "Whole (per kg)", price: 1430 }] },
  { category: "cakes", name: "Dates Cake", description: "Sweet date cake.", price: 270, prepTime: 2, isVegetarian: true, options: [{ name: "Slice", price: 0 }, { name: "Whole (per kg)", price: 1430 }] },
];

async function main() {
  console.log("Seeding Amorino Café database...");

  // Reset menu tables so the DB always matches the official menu PDF.
  await db.delete(menuItems);
  await db.delete(categories);
  console.log("  cleared previous menu");

  const categoryIds = new Map<string, string>();
  for (const c of categoriesData) {
    const [created] = await db.insert(categories).values(c).returning();
    categoryIds.set(c.slug, created.id);
    console.log(`  category: ${c.name}`);
  }

  for (const item of menuData) {
    await db.insert(menuItems).values({
      categoryId: categoryIds.get(item.category),
      name: item.name,
      slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      description: item.description,
      price: item.price.toFixed(2),
      prepTimeMinutes: item.prepTime,
      isPopular: item.isPopular ?? false,
      isVegetarian: item.isVegetarian ?? false,
      isSpicy: item.isSpicy ?? false,
      options: (item.options ?? []).filter((o) => o.price > 0).length
        ? (item.options ?? []).map((o) => (o.price > 0 ? { name: `${o.name} (+${o.price})`, price: o.price } : o))
        : item.options ?? [],
      imageUrl: categoriesData.find((c) => c.slug === item.category)?.imageUrl ?? null,
    });
    console.log(`  item: ${item.name}`);
  }

  const ownerExists = await db.query.users.findFirst({ where: (t, { eq }) => eq(t.phone, "254706090909") });
  if (!ownerExists) {
    await db.insert(users).values({
      phone: "254706090909",
      name: "Amorino Owner",
      role: "owner",
    });
    console.log("  owner user created (254706090909)");
  }

  await seedDefaultSettings();
  console.log("  default settings seeded");

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});