"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"

type Department = { _id: string; name: string; description?: string }

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  function load() {
    fetch("/api/departments")
      .then((r) => r.json())
      .then(setDepartments)
  }

  useEffect(load, [])

  async function create() {
    const res = await fetch("/api/departments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, description }),
    })
    if (!res.ok) {
      toast.error("Could not create department")
      return
    }
    setOpen(false)
    setName("")
    setDescription("")
    load()
  }

  async function remove(id: string) {
    const res = await fetch(`/api/departments/${id}`, { method: "DELETE" })
    if (!res.ok) {
      toast.error("Department is in use and can't be deleted")
      return
    }
    load()
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Departments</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button>Add department</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New department</DialogTitle>
            </DialogHeader>
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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
            <TableHead>Description</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {departments.map((d) => (
            <TableRow key={d._id}>
              <TableCell>{d.name}</TableCell>
              <TableCell>{d.description}</TableCell>
              <TableCell>
                <Button size="sm" variant="ghost" onClick={() => remove(d._id)}>
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
