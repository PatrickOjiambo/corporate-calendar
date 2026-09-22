"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { EVENT_CATEGORIES, EVENT_AUDIENCES } from "@/lib/constants"
import { SUBSIDIARY_TIMEZONES, localDateTimeToUtc } from "@/lib/timezone"

const formSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().max(2000).optional(),
    allDay: z.boolean(),
    startDate: z.string().min(1, "Start is required"),
    endDate: z.string().min(1, "End is required"),
    timezone: z.string().min(1, "Timezone is required"),
    venue: z.string().min(1, "Venue is required"),
    organizingDepartment: z.string().min(1, "Department is required"),
    category: z.enum(EVENT_CATEGORIES),
    audience: z.enum(EVENT_AUDIENCES),
    audienceDepartments: z.array(z.string()).optional(),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End must be on or after start",
    path: ["endDate"],
  })

type FormValues = z.infer<typeof formSchema>
type Option = { _id: string; name: string; timezone?: string }

export function EventForm({
  mode,
  eventId,
  defaultValues,
}: {
  mode: "create" | "edit"
  eventId?: string
  defaultValues?: Partial<FormValues>
}) {
  const router = useRouter()
  const [venues, setVenues] = useState<Option[]>([])
  const [departments, setDepartments] = useState<Option[]>([])

  useEffect(() => {
    fetch("/api/venues")
      .then((r) => r.json())
      .then(setVenues)
    fetch("/api/departments")
      .then((r) => r.json())
      .then(setDepartments)
  }, [])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      allDay: false,
      startDate: "",
      endDate: "",
      timezone: "Africa/Nairobi",
      venue: "",
      organizingDepartment: "",
      category: "Meeting",
      audience: "EntireOrganization",
      audienceDepartments: [],
      ...defaultValues,
    },
  })

  const allDay = form.watch("allDay")
  const audience = form.watch("audience")

  async function onSubmit(values: FormValues) {
    const startAt = values.allDay
      ? new Date(`${values.startDate}T00:00:00Z`)
      : localDateTimeToUtc(values.startDate, values.timezone)
    const endAt = values.allDay
      ? new Date(`${values.endDate}T00:00:00Z`)
      : localDateTimeToUtc(values.endDate, values.timezone)

    const payload = {
      title: values.title,
      description: values.description,
      allDay: values.allDay,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      timezone: values.timezone,
      venue: values.venue,
      organizingDepartment: values.organizingDepartment,
      category: values.category,
      audience: values.audience,
      audienceDepartments: values.audienceDepartments,
    }

    const res = await fetch(mode === "create" ? "/api/events" : `/api/events/${eventId}`, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      toast.error("Could not save the event. Check the form and try again.")
      return
    }

    toast.success(mode === "create" ? "Event submitted for approval" : "Event updated")
    router.push("/my-events")
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6 max-w-xl">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="allDay"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <FormLabel className="mb-0">Whole day event</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start</FormLabel>
                <FormControl>
                  <Input type={allDay ? "date" : "datetime-local"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End</FormLabel>
                <FormControl>
                  <Input type={allDay ? "date" : "datetime-local"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {!allDay && (
          <FormField
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Timezone</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SUBSIDIARY_TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="venue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Venue</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value)
                  const venue = venues.find((v) => v._id === value)
                  if (venue?.timezone && !allDay) {
                    form.setValue("timezone", venue.timezone)
                  }
                }}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a venue" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {venues.map((v) => (
                    <SelectItem key={v._id} value={v._id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="organizingDepartment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organizing department</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d._id} value={d._id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EVENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="audience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Audience</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EVENT_AUDIENCES.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {(audience === "Department" || audience === "SpecificDepartments") && (
          <FormField
            control={form.control}
            name="audienceDepartments"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departments for this audience</FormLabel>
                <div className="flex flex-col gap-2">
                  {departments.map((d) => {
                    const checked = field.value?.includes(d._id) ?? false
                    return (
                      <Label key={d._id} className="flex items-center gap-2 font-normal">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = new Set(field.value ?? [])
                            if (e.target.checked) next.add(d._id)
                            else next.delete(d._id)
                            field.onChange(Array.from(next))
                          }}
                        />
                        {d.name}
                      </Label>
                    )
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {mode === "create" ? "Submit for approval" : "Save changes"}
        </Button>
      </form>
    </Form>
  )
}
