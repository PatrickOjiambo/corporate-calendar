import { connectToDatabase } from "@/lib/db"
import { Department } from "@/models/department"
import { Venue } from "@/models/venue"

const DEPARTMENTS = [
  "Human Resource",
  "Risk and Compliance",
  "Internal Audit",
  "Research and Development",
  "Corporate Affairs",
  "ICT",
  "Legal",
  "Administration",
  "Property",
  "Investments",
  "Supply Chain",
  "Finance",
  "Credit Control",
  "Local Business",
  "Life Business",
  "International Facultative Business",
  "International Treaty Business",
  "Marketing",
  "Claims",
  "Actuarial",
  "Retakaful",
  "Archives",
  "Zambia Subsidiary",
  "Uganda Subsidiary",
  "Ivory Coast Subsidiary",
]

const VENUES = [
  { name: "Kenya Re Academy", location: "Nairobi, Kenya", timezone: "Africa/Nairobi", isOnline: false },
  { name: "Online", timezone: "Africa/Nairobi", isOnline: true },
]

async function main() {
  await connectToDatabase()

  for (const name of DEPARTMENTS) {
    await Department.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true })
  }
  console.log(`Departments: ${DEPARTMENTS.length} ensured.`)

  for (const venue of VENUES) {
    await Venue.updateOne({ name: venue.name }, { $setOnInsert: venue }, { upsert: true })
  }
  console.log(`Venues: ${VENUES.length} ensured.`)

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
