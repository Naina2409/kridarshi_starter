export type UserRole = "farmer" | "trader";

export interface UserAccount {
  id: number;
  phone: string;
  name: string;
  village: string;
  role: UserRole;
  passwordHash: string; // crypto SHA256 hashed password
  preferred_language: string;
  created_at: Date;
}

export interface Farmer {
  id: number;
  name: string;
  phone: string;
  village: string;
  preferred_language: string;
  role?: UserRole;
}

export type CategoryChoice = "seed" | "fertilizer" | "tool" | "produce";

export interface InventoryItem {
  id: string;
  farmerId: number;
  name: string;
  category: CategoryChoice;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  expiry_date: string | null;
  updated_at: Date;
}

export interface Alert {
  id: string;
  farmerId: number;
  itemId: string | null;
  message: string;
  created_at: Date;
  sent: boolean;
}

export function isLowStock(item: InventoryItem): boolean {
  return item.quantity <= item.low_stock_threshold;
}

export function daysToExpiry(item: InventoryItem): number | null {
  if (!item.expiry_date) return null;
  const expiry = new Date(item.expiry_date);
  const now = new Date();
  // Strip time for accurate day difference
  const expDay = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate()).getTime();
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffTime = expDay - nowDay;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function isExpiringSoon(item: InventoryItem): boolean {
  const d = daysToExpiry(item);
  return d !== null && d >= 0 && d <= 5;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  nameKey: string;
  category: "tool" | "fertilizer";
  description: string;
  savedAmount: number;
  ingredients: { name: string; quantity: number; unit: string }[];
  outputItem: { name: string; category: CategoryChoice; quantity: number; unit: string };
  instructions: string[];
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: "bamboo_trellis",
    name: "Bamboo Climber Trellis",
    nameKey: "tool_trellis",
    category: "tool",
    description: "Support structure for climbing vegetables like beans, peas, and gourds.",
    savedAmount: 650,
    ingredients: [
      { name: "Bamboo", quantity: 4, unit: "pcs" },
      { name: "Rope", quantity: 2, unit: "pcs" },
    ],
    outputItem: { name: "Bamboo Trellis", category: "tool", quantity: 1, unit: "pcs" },
    instructions: [
      "Position 4 bamboo stalks vertically 1.5 feet apart along the crop ridge.",
      "Lash horizontal crossbars securely using double loop knots with rope.",
      "Anchor the corners into the ground 6 inches deep for wind stability."
    ]
  },
  {
    id: "organic_compost",
    name: "Nutrient-Rich Farm Compost",
    nameKey: "tool_compost",
    category: "fertilizer",
    description: "High-nitrogen bio-fertilizer made from farm waste and organic matter.",
    savedAmount: 400,
    ingredients: [
      { name: "Organic Waste", quantity: 10, unit: "kg" },
      { name: "Compost Bin", quantity: 1, unit: "pcs" },
    ],
    outputItem: { name: "Farm Compost", category: "fertilizer", quantity: 8, unit: "kg" },
    instructions: [
      "Chop organic crop residues into 2-inch pieces to maximize surface area.",
      "Layer wet green waste with dry straw or brown leaves in a 2:1 ratio.",
      "Maintain 50% moisture and turn weekly for accelerated composting."
    ]
  },
  {
    id: "seedling_cloche",
    name: "Frost & Pest Protection Cloche",
    nameKey: "tool_cloche",
    category: "tool",
    description: "Micro-climate greenhouse shield for tender nursery seedlings and winter crops.",
    savedAmount: 800,
    ingredients: [
      { name: "Plastic Sheet", quantity: 1, unit: "pcs" },
      { name: "Wooden Frame", quantity: 1, unit: "pcs" },
    ],
    outputItem: { name: "Seedling Cloche", category: "tool", quantity: 1, unit: "pcs" },
    instructions: [
      "Stretch the heavy-gauge clear polyethylene film tightly over the wooden A-frame.",
      "Fasten edges with wooden battens or clips to prevent tearing.",
      "Place over early seedling beds with ventilation gaps during warm afternoons."
    ]
  },
  {
    id: "drip_irrigation_rig",
    name: "Gravity Bottle Drip Rig",
    nameKey: "tool_drip",
    category: "tool",
    description: "Targeted root-zone hydration rig saving up to 70% irrigation water.",
    savedAmount: 1200,
    ingredients: [
      { name: "Bamboo", quantity: 2, unit: "pcs" },
      { name: "Rope", quantity: 1, unit: "pcs" },
    ],
    outputItem: { name: "Drip Irrigation Rig", category: "tool", quantity: 1, unit: "pcs" },
    instructions: [
      "Drive bamboo uprights adjacent to high-value fruiting plants.",
      "Fasten punctured inverted irrigation reservoirs 1 foot above root crowns.",
      "Regulate wick or needle valve drip rate to 2 drops per second."
    ]
  }
];

export interface TraderContact {
  id: string;
  name: string;
  firmName: string;
  mandi: string;
  state: string;
  buyingCrops: string[];
  quotedPrice: number;
  crop: string;
  rating: number;
  phone: string;
  verified: boolean;
  minVolumeQuintals: number;
}

export const TRADERS: TraderContact[] = [
  {
    id: "t1",
    name: "Suresh Gupta",
    firmName: "Gupta Agro Commission Agents",
    mandi: "Sonipat Mandi",
    state: "Haryana",
    buyingCrops: ["Wheat", "Mustard", "Rice"],
    crop: "Wheat",
    quotedPrice: 2285,
    rating: 4.8,
    phone: "+919812345671",
    verified: true,
    minVolumeQuintals: 10,
  },
  {
    id: "t2",
    name: "Harpreet Singh Brar",
    firmName: "Kisan Grain Trading Co.",
    mandi: "Karnal Mandi",
    state: "Haryana",
    buyingCrops: ["Basmati Rice", "Wheat"],
    crop: "Rice",
    quotedPrice: 3880,
    rating: 4.9,
    phone: "+919876543210",
    verified: true,
    minVolumeQuintals: 15,
  },
  {
    id: "t3",
    name: "Rajeshwar Chauhan",
    firmName: "Azadpur Vegetable Aggregators",
    mandi: "Azadpur Mandi (Delhi)",
    state: "Delhi",
    buyingCrops: ["Onion", "Potato", "Tomato", "Banana"],
    crop: "Onion",
    quotedPrice: 3120,
    rating: 4.7,
    phone: "+919811223344",
    verified: true,
    minVolumeQuintals: 5,
  },
  {
    id: "t4",
    name: "Mahesh Choudhary",
    firmName: "Narela Kisan Mandi Merchants",
    mandi: "Narela Mandi",
    state: "Delhi NCR",
    buyingCrops: ["Wheat", "Mustard", "Potato"],
    crop: "Mustard",
    quotedPrice: 5650,
    rating: 4.8,
    phone: "+919822334455",
    verified: true,
    minVolumeQuintals: 8,
  },
  {
    id: "t5",
    name: "Pravin Deshmukh",
    firmName: "Deshmukh Agro Exports",
    mandi: "Nashik Mandi",
    state: "Maharashtra",
    buyingCrops: ["Onion", "Tomato", "Banana"],
    crop: "Banana",
    quotedPrice: 2450,
    rating: 4.9,
    phone: "+919833445566",
    verified: true,
    minVolumeQuintals: 20,
  },
];

export interface CropProfitAnalysis {
  crop: string;
  cropKey: string;
  season: string;
  avgYieldQuintalsPerAcre: number;
  marketPricePerQuintal: number;
  grossRevenuePerAcre: number;
  cultivationCostPerAcre: {
    seeds: number;
    fertilizer: number;
    irrigation: number;
    labor: number;
    machineryHarvest: number;
    total: number;
  };
  netProfitPerAcre: number;
  roiPercentage: number;
  waterConsumptionLitersPerAcre: number;
  waterEfficiencyKgPerThousandLiter: number;
  fertilizerInputKgPerAcre: number;
  riskRating: "Low" | "Medium" | "High";
  recommendedRotation: string;
}

export const CROP_PROFIT_ANALYSIS: CropProfitAnalysis[] = [
  {
    crop: "Wheat (HD-2967)",
    cropKey: "crop_wheat",
    season: "Rabi",
    avgYieldQuintalsPerAcre: 21,
    marketPricePerQuintal: 2275,
    grossRevenuePerAcre: 47775,
    cultivationCostPerAcre: {
      seeds: 1800,
      fertilizer: 4200,
      irrigation: 3500,
      labor: 6000,
      machineryHarvest: 4500,
      total: 20000,
    },
    netProfitPerAcre: 27775,
    roiPercentage: 138.9,
    waterConsumptionLitersPerAcre: 1800000,
    waterEfficiencyKgPerThousandLiter: 1.17,
    fertilizerInputKgPerAcre: 110,
    riskRating: "Low",
    recommendedRotation: "Rotate with Mung Bean / Legumes to replenish soil nitrogen.",
  },
  {
    crop: "Basmati Rice (Pusa 1121)",
    cropKey: "crop_rice",
    season: "Kharif",
    avgYieldQuintalsPerAcre: 18,
    marketPricePerQuintal: 3850,
    grossRevenuePerAcre: 69300,
    cultivationCostPerAcre: {
      seeds: 2200,
      fertilizer: 5800,
      irrigation: 9500,
      labor: 8500,
      machineryHarvest: 5500,
      total: 31500,
    },
    netProfitPerAcre: 37800,
    roiPercentage: 120.0,
    waterConsumptionLitersPerAcre: 4200000,
    waterEfficiencyKgPerThousandLiter: 0.43,
    fertilizerInputKgPerAcre: 145,
    riskRating: "Medium",
    recommendedRotation: "Follow with Mustard or Chickpea to reduce water drawdown.",
  },
  {
    crop: "Yellow Mustard (Pusa Bold)",
    cropKey: "crop_mustard",
    season: "Rabi",
    avgYieldQuintalsPerAcre: 9,
    marketPricePerQuintal: 5650,
    grossRevenuePerAcre: 50850,
    cultivationCostPerAcre: {
      seeds: 950,
      fertilizer: 3100,
      irrigation: 2200,
      labor: 4500,
      machineryHarvest: 3800,
      total: 14550,
    },
    netProfitPerAcre: 36300,
    roiPercentage: 249.5,
    waterConsumptionLitersPerAcre: 950000,
    waterEfficiencyKgPerThousandLiter: 0.95,
    fertilizerInputKgPerAcre: 75,
    riskRating: "Low",
    recommendedRotation: "Optimal after Cotton or Maize; low water requirement.",
  },
  {
    crop: "Nashik Red Onion",
    cropKey: "crop_onion",
    season: "Rabi",
    avgYieldQuintalsPerAcre: 110,
    marketPricePerQuintal: 1950,
    grossRevenuePerAcre: 214500,
    cultivationCostPerAcre: {
      seeds: 6500,
      fertilizer: 11200,
      irrigation: 8500,
      labor: 18000,
      machineryHarvest: 9000,
      total: 53200,
    },
    netProfitPerAcre: 161300,
    roiPercentage: 303.2,
    waterConsumptionLitersPerAcre: 2200000,
    waterEfficiencyKgPerThousandLiter: 5.0,
    fertilizerInputKgPerAcre: 180,
    riskRating: "High",
    recommendedRotation: "Requires well-drained soil; follow with cereal crops.",
  },
  {
    crop: "Potato (Kufri Pukhraj)",
    cropKey: "crop_potato",
    season: "Rabi",
    avgYieldQuintalsPerAcre: 130,
    marketPricePerQuintal: 1250,
    grossRevenuePerAcre: 162500,
    cultivationCostPerAcre: {
      seeds: 18000,
      fertilizer: 12500,
      irrigation: 7500,
      labor: 14000,
      machineryHarvest: 8000,
      total: 60000,
    },
    netProfitPerAcre: 102500,
    roiPercentage: 170.8,
    waterConsumptionLitersPerAcre: 2100000,
    waterEfficiencyKgPerThousandLiter: 6.19,
    fertilizerInputKgPerAcre: 195,
    riskRating: "Medium",
    recommendedRotation: "Plant Green Manure / Dhaincha post harvest for soil vitality.",
  },
];

export interface DailyAgriculturalWeather {
  day: string;
  dateStr: string;
  tempMax: number;
  tempMin: number;
  condition: string;
  conditionIcon: string;
  rainChancePct: number;
  rainfallMm: number;
  humidityPct: number;
  windSpeedKmh: number;
  agriculturalAdvisory: string;
  sprayRecommendation: "Optimal" | "Caution" | "Avoid";
}

export function getAgriculturalWeatherForecast(): DailyAgriculturalWeather[] {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const now = new Date();

  const configs: Omit<DailyAgriculturalWeather, "day" | "dateStr">[] = [
    {
      tempMax: 31,
      tempMin: 22,
      condition: "Partly Cloudy",
      conditionIcon: "⛅",
      rainChancePct: 15,
      rainfallMm: 0,
      humidityPct: 58,
      windSpeedKmh: 12,
      agriculturalAdvisory: "Optimal window for scheduled foliar pesticide spray and weeding between 7:00 AM - 10:00 AM.",
      sprayRecommendation: "Optimal",
    },
    {
      tempMax: 29,
      tempMin: 21,
      condition: "Overcast & Breezy",
      conditionIcon: "☁️",
      rainChancePct: 40,
      rainfallMm: 3.5,
      humidityPct: 74,
      windSpeedKmh: 18,
      agriculturalAdvisory: "High relative humidity detected. Scout vulnerable crops for powdery mildew and blight symptoms.",
      sprayRecommendation: "Caution",
    },
    {
      tempMax: 26,
      tempMin: 19,
      condition: "Scattered Rain Showers",
      conditionIcon: "🌧️",
      rainChancePct: 80,
      rainfallMm: 18.0,
      humidityPct: 86,
      windSpeedKmh: 24,
      agriculturalAdvisory: "Postpone irrigation cycles and urea broadcast application to prevent fertilizer leaching and runoff.",
      sprayRecommendation: "Avoid",
    },
    {
      tempMax: 28,
      tempMin: 20,
      condition: "Clearing & Fresh",
      conditionIcon: "🌤️",
      rainChancePct: 25,
      rainfallMm: 1.0,
      humidityPct: 65,
      windSpeedKmh: 14,
      agriculturalAdvisory: "Soil moisture is primed. Inspect drainage ditches and loosen surface crust in nurseries.",
      sprayRecommendation: "Optimal",
    },
    {
      tempMax: 32,
      tempMin: 23,
      condition: "Sunny & Warm",
      conditionIcon: "☀️",
      rainChancePct: 10,
      rainfallMm: 0,
      humidityPct: 50,
      windSpeedKmh: 11,
      agriculturalAdvisory: "Ideal sunny conditions for sun-drying harvested grains, composting, and nursery bed solarization.",
      sprayRecommendation: "Optimal",
    },
  ];

  return configs.map((cfg, idx) => {
    const d = new Date(now);
    d.setDate(d.getDate() + idx);
    const dayName = idx === 0 ? "Today" : idx === 1 ? "Tomorrow" : days[d.getDay()];
    const dateFormatted = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    return {
      day: dayName,
      dateStr: dateFormatted,
      ...cfg,
    };
  });
}

export const FIVE_DAY_WEATHER: DailyAgriculturalWeather[] = getAgriculturalWeatherForecast();

import crypto from "crypto";

export function hashPassword(plain: string): string {
  return crypto.createHash("sha256").update(plain.trim()).digest("hex");
}

class Database {
  private users: Map<number, UserAccount> = new Map();
  private usersByPhone: Map<string, number> = new Map();
  private farmers: Map<number, Farmer> = new Map();
  private items: Map<string, InventoryItem> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private nextFarmerId = 1;
  private nextItemId = 1;
  private nextAlertId = 1;

  constructor() {
    this.seed();
  }

  private seed() {
    // Seed default farmer account (Ramesh Kumar)
    const farmerUser: UserAccount = {
      id: this.nextFarmerId++,
      name: "Ramesh Kumar",
      phone: "9800000000",
      village: "Sonipat",
      role: "farmer",
      passwordHash: hashPassword("kisan123"),
      preferred_language: "English",
      created_at: new Date(),
    };
    this.users.set(farmerUser.id, farmerUser);
    this.usersByPhone.set(farmerUser.phone, farmerUser.id);
    this.farmers.set(farmerUser.id, {
      id: farmerUser.id,
      name: farmerUser.name,
      phone: farmerUser.phone,
      village: farmerUser.village,
      preferred_language: farmerUser.preferred_language,
      role: farmerUser.role,
    });

    // Seed default trader account (Sunil Gupta)
    const traderUser: UserAccount = {
      id: this.nextFarmerId++,
      name: "Sunil Gupta",
      phone: "9811002233",
      village: "Azadpur Mandi",
      role: "trader",
      passwordHash: hashPassword("trader123"),
      preferred_language: "English",
      created_at: new Date(),
    };
    this.users.set(traderUser.id, traderUser);
    this.usersByPhone.set(traderUser.phone, traderUser.id);

    const now = new Date();
    const inTwoDays = new Date(now);
    inTwoDays.setDate(inTwoDays.getDate() + 2);
    const inTwoDaysStr = inTwoDays.toISOString().split("T")[0];

    const inMonth = new Date(now);
    inMonth.setDate(inMonth.getDate() + 45);
    const inMonthStr = inMonth.toISOString().split("T")[0];

    const initialItems: Omit<InventoryItem, "id" | "farmerId" | "updated_at">[] = [
      {
        name: "Urea",
        category: "fertilizer",
        quantity: 2,
        unit: "kg",
        low_stock_threshold: 5,
        expiry_date: inTwoDaysStr,
      },
      {
        name: "Wheat Seed",
        category: "seed",
        quantity: 25,
        unit: "kg",
        low_stock_threshold: 10,
        expiry_date: inMonthStr,
      },
      {
        name: "Banana",
        category: "produce",
        quantity: 0,
        unit: "kg",
        low_stock_threshold: 5,
        expiry_date: inTwoDaysStr,
      },
      {
        name: "Organic Waste",
        category: "produce",
        quantity: 12,
        unit: "kg",
        low_stock_threshold: 5,
        expiry_date: null,
      },
      {
        name: "Compost Bin",
        category: "tool",
        quantity: 1,
        unit: "pcs",
        low_stock_threshold: 1,
        expiry_date: null,
      },
      {
        name: "Bamboo",
        category: "tool",
        quantity: 8,
        unit: "pcs",
        low_stock_threshold: 2,
        expiry_date: null,
      },
      {
        name: "Rope",
        category: "tool",
        quantity: 4,
        unit: "pcs",
        low_stock_threshold: 1,
        expiry_date: null,
      },
      {
        name: "Plastic Sheet",
        category: "tool",
        quantity: 2,
        unit: "pcs",
        low_stock_threshold: 1,
        expiry_date: null,
      },
      {
        name: "Wooden Frame",
        category: "tool",
        quantity: 1,
        unit: "pcs",
        low_stock_threshold: 1,
        expiry_date: null,
      },
    ];

    for (const raw of initialItems) {
      const id = String(this.nextItemId++);
      this.items.set(id, {
        ...raw,
        id,
        farmerId: farmerUser.id,
        updated_at: new Date(),
      });
    }

    this.checkAlerts();
  }

  // Authentication & User Accounts
  getUserById(id: number): UserAccount | undefined {
    return this.users.get(id);
  }

  getUserByPhone(phone: string): UserAccount | undefined {
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    const id = this.usersByPhone.get(cleanPhone);
    return id ? this.users.get(id) : undefined;
  }

  getAllUsers(): UserAccount[] {
    return Array.from(this.users.values());
  }

  getUserByRole(role: UserRole): UserAccount | undefined {
    return Array.from(this.users.values()).find((u) => u.role === role);
  }

  registerUser(data: {
    name: string;
    phone: string;
    village: string;
    role: UserRole;
    password: string;
    preferred_language?: string;
  }): { success: boolean; message: string; user?: UserAccount } {
    const cleanPhone = data.phone.replace(/\D/g, "").slice(-10);
    if (!cleanPhone || cleanPhone.length < 10) {
      return { success: false, message: "Please provide a valid 10-digit mobile number." };
    }
    if (this.usersByPhone.has(cleanPhone)) {
      return { success: false, message: "An account with this mobile number already exists. Please log in." };
    }
    if (!data.name || data.name.trim().length < 2) {
      return { success: false, message: "Name must be at least 2 characters." };
    }
    if (!data.password || data.password.length < 4) {
      return { success: false, message: "Password must be at least 4 characters long." };
    }

    const id = this.nextFarmerId++;
    const user: UserAccount = {
      id,
      name: data.name.trim(),
      phone: cleanPhone,
      village: (data.village || "Rural Mandi").trim(),
      role: data.role || "farmer",
      passwordHash: hashPassword(data.password),
      preferred_language: data.preferred_language || "English",
      created_at: new Date(),
    };

    this.users.set(id, user);
    this.usersByPhone.set(cleanPhone, id);

    // Register farmer profile
    this.farmers.set(id, {
      id,
      name: user.name,
      phone: user.phone,
      village: user.village,
      preferred_language: user.preferred_language,
      role: user.role,
    });

    // Provide default starter items for a new farmer
    if (user.role === "farmer") {
      const now = new Date();
      const inTwoWeeks = new Date(now);
      inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
      const inTwoWeeksStr = inTwoWeeks.toISOString().split("T")[0];

      const starterItems: Omit<InventoryItem, "id" | "farmerId" | "updated_at">[] = [
        { name: "Wheat Seed", category: "seed", quantity: 20, unit: "kg", low_stock_threshold: 5, expiry_date: null },
        { name: "Organic Waste", category: "produce", quantity: 15, unit: "kg", low_stock_threshold: 5, expiry_date: null },
        { name: "Bamboo", category: "tool", quantity: 6, unit: "pcs", low_stock_threshold: 2, expiry_date: null },
        { name: "Rope", category: "tool", quantity: 3, unit: "pcs", low_stock_threshold: 1, expiry_date: null },
        { name: "Urea", category: "fertilizer", quantity: 4, unit: "kg", low_stock_threshold: 10, expiry_date: inTwoWeeksStr },
      ];
      for (const item of starterItems) {
        this.addItem(id, item);
      }
    }

    return { success: true, message: "Account registered successfully!", user };
  }

  authenticateUser(phone: string, passwordPlain: string): { success: boolean; message: string; user?: UserAccount } {
    const user = this.getUserByPhone(phone);
    if (!user) {
      return { success: false, message: "No account found with this mobile number. Please check or register." };
    }
    const hash = hashPassword(passwordPlain);
    if (user.passwordHash !== hash) {
      return { success: false, message: "Incorrect password. Please try again." };
    }
    return { success: true, message: "Logged in successfully!", user };
  }

  getFarmerById(id: number): Farmer {
    const existing = this.farmers.get(id);
    if (existing) return existing;
    const user = this.users.get(id);
    if (user) {
      const farmer: Farmer = {
        id: user.id,
        name: user.name,
        phone: user.phone,
        village: user.village,
        preferred_language: user.preferred_language,
        role: user.role,
      };
      this.farmers.set(id, farmer);
      return farmer;
    }
    return this.getDemoFarmer();
  }

  getDemoFarmer(): Farmer {
    const farmer = this.farmers.get(1);
    if (farmer) return farmer;
    const newFarmer: Farmer = {
      id: 1,
      name: "Ramesh Kumar",
      phone: "+919800000000",
      village: "Sonipat",
      preferred_language: "English",
    };
    this.farmers.set(1, newFarmer);
    return newFarmer;
  }

  updateFarmerLanguage(farmerId: number, languageName: string) {
    const f = this.farmers.get(farmerId);
    if (f) {
      f.preferred_language = languageName;
    }
  }

  getFarmerItems(farmerId: number): InventoryItem[] {
    return Array.from(this.items.values()).filter((i) => i.farmerId === farmerId);
  }

  addItem(
    farmerId: number,
    data: {
      name: string;
      category: CategoryChoice;
      quantity: number;
      unit: string;
      low_stock_threshold: number;
      expiry_date: string | null;
    }
  ): InventoryItem {
    const id = String(this.nextItemId++);
    const item: InventoryItem = {
      id,
      farmerId,
      name: data.name,
      category: data.category,
      quantity: data.quantity,
      unit: data.unit || "kg",
      low_stock_threshold: data.low_stock_threshold ?? 5,
      expiry_date: data.expiry_date || null,
      updated_at: new Date(),
    };
    this.items.set(id, item);
    this.checkAlerts();
    return item;
  }

  getAlerts(farmerId: number): Alert[] {
    return Array.from(this.alerts.values()).filter((a) => a.farmerId === farmerId);
  }

  getItem(id: string): InventoryItem | undefined {
    return this.items.get(id);
  }

  findItemByName(farmerId: number, name: string): InventoryItem | undefined {
    const n = name.toLowerCase().trim();
    return Array.from(this.items.values()).find(
      (i) => i.farmerId === farmerId && i.name.toLowerCase().trim() === n
    );
  }

  updateQuantity(idOrFarmer: string | number, deltaOrId: number | string, deltaVal?: number): InventoryItem | null {
    const id = typeof idOrFarmer === "number" ? String(deltaOrId) : String(idOrFarmer);
    const delta = typeof deltaVal === "number" ? deltaVal : (typeof deltaOrId === "number" ? deltaOrId : 0);
    const item = this.items.get(id);
    if (!item) return null;
    item.quantity = Math.max(0, Math.round((item.quantity + delta) * 10) / 10);
    item.updated_at = new Date();
    this.checkAlerts();
    return item;
  }

  setQuantity(idOrFarmer: string | number, qtyOrId: number | string, qtyVal?: number): InventoryItem | null {
    const id = typeof idOrFarmer === "number" ? String(qtyOrId) : String(idOrFarmer);
    const qty = typeof qtyVal === "number" ? qtyVal : (typeof qtyOrId === "number" ? qtyOrId : 0);
    const item = this.items.get(id);
    if (!item) return null;
    item.quantity = Math.max(0, Math.round(qty * 10) / 10);
    item.updated_at = new Date();
    this.checkAlerts();
    return item;
  }

  deleteItem(idOrFarmer: string | number, maybeId?: string | number): boolean {
    const id = maybeId !== undefined ? String(maybeId) : String(idOrFarmer);
    const deleted = this.items.delete(id);
    if (deleted) {
      // Remove alerts associated with this item
      for (const [alertId, alert] of this.alerts.entries()) {
        if (alert.itemId === id) {
          this.alerts.delete(alertId);
        }
      }
    }
    return deleted;
  }

  addAlert(farmerId: number, type: string, message: string): Alert {
    return this.addCustomAlert(farmerId, `[${type}] ${message}`);
  }

  addCustomAlert(farmerId: number, message: string, itemId: string | null = null): Alert {
    const id = String(this.nextAlertId++);
    const alert: Alert = {
      id,
      farmerId,
      itemId,
      message,
      created_at: new Date(),
      sent: false,
    };
    this.alerts.set(id, alert);
    return alert;
  }

  markAlertSent(id: string) {
    const alert = this.alerts.get(id);
    if (alert) alert.sent = true;
  }

  craftRecipe(farmerId: number, recipeId: string): { success: boolean; message: string; savedAmount?: number; toolName?: string } {
    const recipe = CRAFTING_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return { success: false, message: "Invalid recipe." };

    // Check all ingredients
    for (const ing of recipe.ingredients) {
      const item = this.findItemByName(farmerId, ing.name);
      if (!item || item.quantity < ing.quantity) {
        return {
          success: false,
          message: `Insufficient ${ing.name}. Need ${ing.quantity}${ing.unit}, but only have ${item ? item.quantity : 0}${ing.unit}.`,
        };
      }
    }

    // Deduct ingredients
    for (const ing of recipe.ingredients) {
      const item = this.findItemByName(farmerId, ing.name)!;
      item.quantity = Math.max(0, Math.round((item.quantity - ing.quantity) * 10) / 10);
      item.updated_at = new Date();
    }

    // Add or increment crafted output item
    const existingOutput = this.findItemByName(farmerId, recipe.outputItem.name);
    if (existingOutput) {
      existingOutput.quantity += recipe.outputItem.quantity;
      existingOutput.updated_at = new Date();
    } else {
      this.addItem(farmerId, {
        name: recipe.outputItem.name,
        category: recipe.outputItem.category,
        quantity: recipe.outputItem.quantity,
        unit: recipe.outputItem.unit,
        low_stock_threshold: 1,
        expiry_date: null,
      });
    }

    this.addCustomAlert(
      farmerId,
      `Crafted: ${recipe.name}! Saved approx ₹${recipe.savedAmount} on external purchase.`
    );
    this.checkAlerts();

    return {
      success: true,
      message: `Successfully crafted ${recipe.name}! You saved ₹${recipe.savedAmount}.`,
      savedAmount: recipe.savedAmount,
      toolName: recipe.name,
    };
  }

  checkAlerts(): number {
    let created = 0;
    for (const item of this.items.values()) {
      const messages: string[] = [];
      if (isLowStock(item)) {
        messages.push(`Low stock alert: ${item.name} is down to ${item.quantity}${item.unit}.`);
      }
      if (isExpiringSoon(item)) {
        const days = daysToExpiry(item);
        messages.push(`Expiry alert: ${item.name} expires in ${days} day(s).`);
      }

      for (const msg of messages) {
        const exists = Array.from(this.alerts.values()).some(
          (a) => a.itemId === item.id && a.message === msg
        );
        if (!exists) {
          const id = String(this.nextAlertId++);
          this.alerts.set(id, {
            id,
            farmerId: item.farmerId,
            itemId: item.id,
            message: msg,
            created_at: new Date(),
            sent: false,
          });
          created++;
        }
      }
    }
    return created;
  }
}

export const db = new Database();
