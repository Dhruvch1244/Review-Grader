const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Reyansh", "Ayaan", "Krishna", "Ishaan", "Rohan",
  "Kabir", "Aryan", "Dhruv", "Karan", "Nikhil", "Yash", "Vikram", "Rahul", "Sai", "Dev",
  "Aarush", "Advait", "Arnav", "Atharv", "Darsh", "Harsh", "Kartik", "Lakshya", "Manav", "Om",
  "Pranav", "Rudra", "Samar", "Shaurya", "Tejas", "Veer", "Yuvraj", "Zain", "Akhil", "Bhavesh",
  "Ananya", "Diya", "Ishita", "Kavya", "Meera", "Riya", "Saanvi", "Tara", "Zara", "Aditi",
  "Anika", "Avni", "Bhavya", "Charvi", "Diya", "Esha", "Gauri", "Ira", "Jiya", "Kiara",
  "Lavanya", "Myra", "Naina", "Pari", "Priya", "Rhea", "Sara", "Shreya", "Simran", "Tanvi",
  "Ahana", "Amaira", "Anaya", "Aria", "Disha", "Isha", "Kashvi", "Navya", "Nisha", "Pihu",
];

const LAST_NAMES = [
  "Shah", "Mehta", "Iyer", "Rao", "Nair", "Joshi", "Kapoor", "Verma", "Pillai", "Malhotra",
  "Khan", "Bose", "Reddy", "Gupta", "Das", "Mehra", "Kaur", "Singh", "Sharma", "Patel",
  "Kumar", "Chatterjee", "Menon", "Pandey", "Agarwal", "Bhatt", "Chauhan", "Desai", "Dubey", "Ghosh",
  "Jain", "Kulkarni", "Mishra", "Nayak", "Rana", "Saxena", "Sinha", "Trivedi", "Yadav", "Bhandari",
  "Chopra", "Dutta", "Krishnan", "Mahajan", "Naidu", "Pillai", "Rathore", "Sengupta", "Thakur", "Vaidya",
];

/** Generates `count` unique "First Last" Indian names (best-effort - falls back to a numeric suffix if the pool is exhausted). */
export function generateIndianNames(count: number): string[] {
  const used = new Set<string>();
  const names: string[] = [];
  let attempts = 0;
  while (names.length < count && attempts < count * 50) {
    attempts++;
    const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const name = `${first} ${last}`;
    if (used.has(name)) continue;
    used.add(name);
    names.push(name);
  }
  let suffix = 2;
  while (names.length < count) {
    const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    names.push(`${first} ${last} ${suffix++}`);
  }
  return names;
}
