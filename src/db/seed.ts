import { db } from "../db";
import { categories, menuItems, users } from "../db/schema";
import { seedDefaultSettings } from "../lib/settings";
import "dotenv/config";

const categoriesData = [
  {
    name: "Mandi & Rice",
    slug: "mandi-rice",
    description: "Our famous Yemeni-style spiced rice with slow-cooked chicken or goat.",
    sortOrder: 1,
  },
  {
    name: "BBQ & Grill",
    slug: "bbq-grill",
    description: "Flame-grilled over charcoal — the Amorino signature.",
    sortOrder: 2,
  },
  {
    name: "Seafood",
    slug: "seafood",
    description: "Fresh from the Indian Ocean, coastal style.",
    sortOrder: 3,
  },
  {
    name: "Shawarma & Wraps",
    slug: "shawarma-wraps",
    description: "Loaded shawarma and wraps, made to order.",
    sortOrder: 4,
  },
  {
    name: "Burgers & Snacks",
    slug: "burgers-snacks",
    description: "Burgers, wings, samosas and fries.",
    sortOrder: 5,
  },
  {
    name: "Coffee & Hot Drinks",
    slug: "coffee-hot-drinks",
    description: "Freshly brewed coffee and chai.",
    sortOrder: 6,
  },
  {
    name: "Shakes & Juices",
    slug: "shakes-juices",
    description: "Thick shakes and fresh tropical juices.",
    sortOrder: 7,
  },
  {
    name: "Desserts",
    slug: "desserts",
    description: "Sweet finishes to your meal.",
    sortOrder: 8,
  },
];

const menuData: Array<{
  category: string;
  name: string;
  description: string;
  price: number;
  prepTime: number;
  isPopular?: boolean;
  isVegetarian?: boolean;
  isSpicy?: boolean;
  options?: { name: string; price: number }[];
}> = [
  // Mandi & Rice
  { category: "mandi-rice", name: "Chicken Mandi", description: "Half chicken slow-roasted over spiced mandi rice, served with hot sauce & salad.", price: 1200, prepTime: 30, isPopular: true, isSpicy: true, options: [{ name: "Full chicken", price: 800 }, { name: "Extra rice", price: 200 }] },
  { category: "mandi-rice", name: "Goat Mandi", description: "Tender goat slow-cooked in mandi spices with fragrant rice.", price: 1500, prepTime: 40, isPopular: true, isSpicy: true },
  { category: "mandi-rice", name: "Mandi Platter (Family)", description: "Full chicken + goat, 2kg spiced rice, salads & sauces. Feeds 4–6.", price: 3500, prepTime: 50, isPopular: true, isSpicy: true },
  { category: "mandi-rice", name: "Chicken Biryani", description: "Coastal biryani with tender chicken, saffron rice & kachumbari.", price: 850, prepTime: 25, isSpicy: true },
  { category: "mandi-rice", name: "Beef Pilau", description: "Swahili pilau with spiced beef and kachumbari.", price: 600, prepTime: 20, isSpicy: true },
  { category: "mandi-rice", name: "Coconut Rice & Chicken Curry", description: "Creamy coastal coconut chicken curry over coconut rice.", price: 800, prepTime: 25, isSpicy: true },

  // BBQ & Grill
  { category: "bbq-grill", name: "BBQ Half Chicken", description: "Charcoal-grilled half chicken, Amorino BBQ glaze & fries.", price: 700, prepTime: 25, isPopular: true },
  { category: "bbq-grill", name: "BBQ Full Chicken", description: "Whole charcoal chicken, house BBQ sauce, fries & salad.", price: 1300, prepTime: 35, isPopular: true },
  { category: "bbq-grill", name: "Beef Ribs (500g)", description: "Smoky beef ribs, slow-grilled and basted.", price: 1200, prepTime: 35, isPopular: true, isSpicy: true },
  { category: "bbq-grill", name: "BBQ Wings (6 pc)", description: "Sticky BBQ wings with ranch dip.", price: 650, prepTime: 20, isSpicy: true },
  { category: "bbq-grill", name: "Tandoori Chicken", description: "Yogurt-marinated tandoori half chicken, grilled over charcoal.", price: 900, prepTime: 30, isSpicy: true },
  { category: "bbq-grill", name: "Grilled Sausages & Chips", description: "Charcoal sausages served with crispy chips.", price: 450, prepTime: 15 },

  // Seafood
  { category: "seafood", name: "Grilled Whole Fish", description: "Whole fish marinated in coastal spices, char-grilled, served with pilau or chips.", price: 1200, prepTime: 30, isPopular: true, isSpicy: true },
  { category: "seafood", name: "Fried Whole Fish", description: "Crispy fried fish with tamarind sauce & ugali or chips.", price: 1100, prepTime: 30, isSpicy: true },
  { category: "seafood", name: "Prawns (500g)", description: "Garlic butter prawns, coastal style.", price: 1500, prepTime: 25, isSpicy: true, options: [{ name: "Tiger prawns", price: 700 }] },
  { category: "seafood", name: "Calamari Rings", description: "Crispy calamari with lemon & garlic aioli.", price: 900, prepTime: 20 },
  { category: "seafood", name: "Fish & Chips", description: "Battered fish fillet with chips and tartar sauce.", price: 950, prepTime: 20 },

  // Shawarma & Wraps
  { category: "shawarma-wraps", name: "Chicken Shawarma", description: "Sliced chicken, garlic sauce, pickles & fries wrap.", price: 400, prepTime: 10, isPopular: true },
  { category: "shawarma-wraps", name: "Beef Shawarma", description: "Spiced beef, tahini, pickles & fries wrap.", price: 450, prepTime: 10, isPopular: true, isSpicy: true },
  { category: "shawarma-wraps", name: "Mixed Shawarma", description: "Chicken + beef loaded shawarma.", price: 500, prepTime: 12, isSpicy: true },
  { category: "shawarma-wraps", name: "Shawarma Platter", description: "Two shawarmas of choice with fries & dips.", price: 900, prepTime: 15, isPopular: true },
  { category: "shawarma-wraps", name: "Grilled Chicken Wrap", description: "Grilled chicken, avocado, lettuce & creamy sauce.", price: 450, prepTime: 12 },

  // Burgers & Snacks
  { category: "burgers-snacks", name: "Amorino Beef Burger", description: "Char-grilled beef patty, cheddar, lettuce, tomato & house sauce.", price: 550, prepTime: 15, isPopular: true, options: [{ name: "Extra patty", price: 250 }, { name: "Add bacon", price: 150 }] },
  { category: "burgers-snacks", name: "Crispy Chicken Burger", description: "Buttermilk fried chicken, slaw & spicy mayo.", price: 500, prepTime: 15, isSpicy: true },
  { category: "burgers-snacks", name: "Double Cheese Burger", description: "Double patty, double cheese, caramelized onions.", price: 600, prepTime: 18 },
  { category: "burgers-snacks", name: "Loaded Fries", description: "Crispy chips topped with cheese sauce, beef & jalapeños.", price: 400, prepTime: 10, isSpicy: true },
  { category: "burgers-snacks", name: "Chips Masala", description: "Swahili-style chips tossed in spicy tomato masala.", price: 300, prepTime: 10, isSpicy: true, isVegetarian: true },
  { category: "burgers-snacks", name: "Beef Samosas (3 pc)", description: "Crispy beef samosas with chutney.", price: 150, prepTime: 8, isSpicy: true },

  // Coffee & Hot Drinks
  { category: "coffee-hot-drinks", name: "Espresso", description: "Double shot, freshly pulled.", price: 200, prepTime: 5, isVegetarian: true },
  { category: "coffee-hot-drinks", name: "Americano", description: "Espresso with hot water.", price: 250, prepTime: 5, isVegetarian: true },
  { category: "coffee-hot-drinks", name: "Cappuccino", description: "Espresso, steamed milk, thick foam.", price: 300, prepTime: 6, isVegetarian: true, isPopular: true },
  { category: "coffee-hot-drinks", name: "Café Latte", description: "Smooth espresso with lots of steamed milk.", price: 300, prepTime: 6, isVegetarian: true },
  { category: "coffee-hot-drinks", name: "Mocha", description: "Espresso, chocolate & steamed milk.", price: 350, prepTime: 6, isVegetarian: true },
  { category: "coffee-hot-drinks", name: "Masala Chai", description: "Spiced milk tea, the coastal way.", price: 200, prepTime: 5, isVegetarian: true },
  { category: "coffee-hot-drinks", name: "Plain Tea", description: "Freshly brewed Kenyan tea.", price: 150, prepTime: 3, isVegetarian: true },

  // Shakes & Juices
  { category: "shakes-juices", name: "Chocolate Shake", description: "Thick chocolate shake topped with whipped cream.", price: 350, prepTime: 5, isVegetarian: true },
  { category: "shakes-juices", name: "Strawberry Shake", description: "Fresh strawberry milkshake.", price: 350, prepTime: 5, isVegetarian: true, isPopular: true },
  { category: "shakes-juices", name: "Oreo Shake", description: "Crushed Oreos blended with vanilla ice cream.", price: 400, prepTime: 5, isVegetarian: true },
  { category: "shakes-juices", name: "Avocado Smoothie", description: "Creamy avocado blended with milk & honey.", price: 300, prepTime: 5, isVegetarian: true },
  { category: "shakes-juices", name: "Fresh Mango Juice", description: "Fresh mango, no added sugar.", price: 250, prepTime: 5, isVegetarian: true },
  { category: "shakes-juices", name: "Passion Juice", description: "Tangy fresh passion fruit juice.", price: 250, prepTime: 5, isVegetarian: true },
  { category: "shakes-juices", name: "Fresh Coconut", description: "Chilled fresh coconut.", price: 200, prepTime: 3, isVegetarian: true },

  // Desserts
  { category: "desserts", name: "Chocolate Cake Slice", description: "Rich chocolate layer cake.", price: 350, prepTime: 3, isVegetarian: true, isPopular: true },
  { category: "desserts", name: "Belgian Waffle & Honey", description: "Hot waffle with honey butter.", price: 400, prepTime: 10, isVegetarian: true },
  { category: "desserts", name: "Vanilla Ice Cream", description: "Two scoops of vanilla.", price: 250, prepTime: 2, isVegetarian: true },
  { category: "desserts", name: "Brownie Sundae", description: "Warm brownie, vanilla ice cream & chocolate sauce.", price: 450, prepTime: 5, isVegetarian: true },
];

async function main() {
  console.log("Seeding Amorino Café database...");

  const categoryIds = new Map<string, string>();
  for (const c of categoriesData) {
    const existing = await db.query.categories.findFirst({ where: (t, { eq }) => eq(t.slug, c.slug) });
    if (existing) {
      categoryIds.set(c.slug, existing.id);
      continue;
    }
    const [created] = await db.insert(categories).values(c).returning();
    categoryIds.set(c.slug, created.id);
    console.log(`  category: ${c.name}`);
  }

  for (const item of menuData) {
    const existing = await db.query.menuItems.findFirst({ where: (t, { eq }) => eq(t.slug, item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")) });
    if (existing) continue;
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
      options: item.options ?? [],
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
