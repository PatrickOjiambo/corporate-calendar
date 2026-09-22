"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { SUBSIDIARY_TIMEZONES } from "@/lib/timezone"

type Venue = { _id: string; name: string; location?: string; timezone: string }

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [location, setLocation] = useState("")
  const [timezone, setTimezone] = useState("Africa/Nairobi")

  function load() {
    fetch("/api/venues")
      .then((r) => r.json())
      .then(setVenues)
  }

  useEffect(load, [])

  async function create() {
    const res = await fetch("/api/venues", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, location, timezone }),
    })
    if (!res.ok) {
      toast.error("Could not create venue")
      return
    }
    setOpen(false)
    setName("")
    setLocation("")
    load()
  }

  async function remove(id: string) {
    const res = await fetch(`/api/venues/${id}`, { method: "DELETE" })
    if (!res.ok) {
      toast.error("Venue is in use and can't be deleted")
      return
    }
    load()
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Venues</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button>Add venue</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New venue</DialogTitle>
            </DialogHeader>
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <Select value={timezone} onValueChange={(value) => value && setTimezone(value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBSIDIARY_TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button disabled={!name.trim()} onClick={create}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Timezone</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {venues.map((v) => (
            <TableRow key={v._id}>
              <TableCell>{v.name}</TableCell>
              <TableCell>{v.location}</TableCell>
              <TableCell>{v.timezone}</TableCell>
              <TableCell>
                <Button size="sm" variant="ghost" onClick={() => remove(v._id)}>
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
