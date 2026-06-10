import { useState, useEffect } from "react";
import { MapPin, Plus, Pencil, Trash2, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/index";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isDefault: boolean;
}

const EMPTY_FORM: Omit<Address, "id" | "isDefault"> = {
  label: "Home",
  fullName: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
};

const LABELS = ["Home", "Office", "Other"];

function storageKey(userId: string) {
  return `nexcart_addresses_${userId}`;
}

function loadAddresses(userId: string): Address[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey(userId)) ?? "[]") as Address[];
  } catch { return []; }
}

function persistAddresses(userId: string, addresses: Address[]) {
  localStorage.setItem(storageKey(userId), JSON.stringify(addresses));
}

export default function AccountAddresses() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Address, "id" | "isDefault">>(EMPTY_FORM);

  useEffect(() => {
    if (!user) return;
    setAddresses(loadAddresses(user.id));
  }, [user]);

  function saveList(updated: Address[]) {
    setAddresses(updated);
    if (user) persistAddresses(user.id, updated);
  }

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(address: Address) {
    setEditingId(address.id);
    setForm({
      label: address.label,
      fullName: address.fullName,
      phone: address.phone,
      street: address.street,
      city: address.city,
      state: address.state,
      country: address.country,
      postalCode: address.postalCode,
    });
    setShowForm(true);
  }

  function handleSubmit() {
    if (!form.fullName.trim()) { toast.error("Full name is required."); return; }
    if (!form.street.trim()) { toast.error("Street address is required."); return; }
    if (!form.city.trim()) { toast.error("City is required."); return; }
    if (!form.country.trim()) { toast.error("Country is required."); return; }

    if (editingId) {
      saveList(addresses.map((a) => a.id === editingId ? { ...a, ...form } : a));
      toast.success("Address updated.");
    } else {
      const newAddr: Address = {
        id: crypto.randomUUID(),
        ...form,
        isDefault: addresses.length === 0,
      };
      saveList([...addresses, newAddr]);
      toast.success("Address added.");
    }
    setShowForm(false);
  }

  function handleDelete(id: string) {
    const updated = addresses.filter((a) => a.id !== id);
    if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
      updated[0] = { ...updated[0], isDefault: true };
    }
    saveList(updated);
    toast.success("Address deleted.");
  }

  function setDefault(id: string) {
    saveList(addresses.map((a) => ({ ...a, isDefault: a.id === id })));
    toast.success("Default address updated.");
  }

  function setField<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#F0F0F0] bg-[#FAFAFA]">
          <MapPin className="h-4 w-4 text-[#E8611A]" />
          <h2 className="font-extrabold text-[#0D0D0D] text-sm">Saved Addresses</h2>
          <button
            onClick={openNew}
            className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-[#E8611A] hover:text-[#C4511A] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Address
          </button>
        </div>

        <div className="p-4">
          {addresses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#FEF0E8] flex items-center justify-center mb-3">
                <MapPin className="h-6 w-6 text-[#E8611A]" />
              </div>
              <h3 className="font-extrabold text-[#0D0D0D] mb-1">No saved addresses</h3>
              <p className="text-sm text-[#9B9B9B] mb-5">
                Save your delivery addresses for faster checkout.
              </p>
              <Button
                onClick={openNew}
                className="gap-2 text-white rounded-full px-5"
                style={{ background: "#E8611A" }}
              >
                <Plus className="h-4 w-4" />
                Add your first address
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    address.isDefault
                      ? "border-[#E8611A]/40 bg-[#FEF9F6]"
                      : "border-[#F0F0F0] bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">
                        {address.label}
                      </span>
                      {address.isDefault && (
                        <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-[#FEF0E8] text-[#E8611A]">
                          <Star className="h-2.5 w-2.5 fill-current" />
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!address.isDefault && (
                        <button
                          onClick={() => setDefault(address.id)}
                          title="Set as default"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9B9B9B] hover:text-[#E8611A] hover:bg-[#FEF0E8] transition-colors"
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(address)}
                        title="Edit"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9B9B9B] hover:text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(address.id)}
                        title="Delete"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9B9B9B] hover:text-[#EF4444] hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 space-y-0.5">
                    <p className="text-sm font-semibold text-[#0D0D0D]">{address.fullName}</p>
                    {address.phone && <p className="text-xs text-[#6B7280]">{address.phone}</p>}
                    <p className="text-xs text-[#6B7280]">{address.street}</p>
                    <p className="text-xs text-[#6B7280]">
                      {[address.city, address.state, address.postalCode].filter(Boolean).join(", ")}
                    </p>
                    <p className="text-xs text-[#6B7280]">{address.country}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit form modal */}
      {showForm && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl overflow-y-auto max-h-[92vh] md:top-1/2 md:left-1/2 md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] md:rounded-2xl md:max-h-[85vh]">
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "#E5E7EB" }} />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F0F0]">
              <h3 className="font-extrabold text-[#0D0D0D] text-base">
                {editingId ? "Edit Address" : "Add New Address"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F3F4F6] hover:bg-[#E5E7EB] transition-colors"
              >
                <X className="h-4 w-4 text-[#6B7280]" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {/* Label selector */}
              <div className="space-y-1.5">
                <Label>Address Label</Label>
                <div className="flex gap-2">
                  {LABELS.map((l) => (
                    <button
                      key={l}
                      onClick={() => setField("label", l)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                      style={{
                        background: form.label === l ? "#E8611A" : "#F9FAFB",
                        color: form.label === l ? "#fff" : "#6B7280",
                        borderColor: form.label === l ? "#E8611A" : "#E5E7EB",
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={form.fullName}
                    onChange={(e) => setField("fullName", e.target.value)}
                    placeholder="Recipient's full name"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Phone (optional)</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    placeholder="+1 234 567 890"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Street Address *</Label>
                  <Input
                    value={form.street}
                    onChange={(e) => setField("street", e.target.value)}
                    placeholder="123 Main Street, Apt 4B"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>City *</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => setField("city", e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>State / Region</Label>
                  <Input
                    value={form.state}
                    onChange={(e) => setField("state", e.target.value)}
                    placeholder="State"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Postal Code</Label>
                  <Input
                    value={form.postalCode}
                    onChange={(e) => setField("postalCode", e.target.value)}
                    placeholder="Postal / ZIP code"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Country *</Label>
                  <Input
                    value={form.country}
                    onChange={(e) => setField("country", e.target.value)}
                    placeholder="Country"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSubmit}
                  className="flex-1 text-white"
                  style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
                >
                  {editingId ? "Update Address" : "Save Address"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
