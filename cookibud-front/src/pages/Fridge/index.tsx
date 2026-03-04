import { useEffect, useState } from "react";
import { Heading, Card, Button, Modal, Input, Pill, StackedList } from "@soilhat/react-components";
import { callApi } from "../../services/api";

interface FridgeItem {
  id?: string;
  name: string;
  expiration_date?: string;
  open_date?: string;
  added_date?: string;
  used: boolean;
}

interface Fridge {
  items: FridgeItem[];
}

export default function FridgePage() {
  const [fridge, setFridge] = useState<Fridge>({ items: [] });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FridgeItem | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [formData, setFormData] = useState<FridgeItem>({
    name: "",
    expiration_date: undefined,
    open_date: undefined,
    used: false,
  });

  useEffect(() => {
    loadFridge();
  }, []);

  const loadFridge = async () => {
    try {
      const res = await callApi<Fridge>("/fridge");
      setFridge(res.data || { items: [] });
    } catch (err) {
      console.error("Failed to load fridge", err);
    }
  };

  const loadSortedFridge = async (direction: "asc" | "desc") => {
    try {
      setSortDir(direction);
      const res = await callApi<{ items: FridgeItem[] }>(`/fridge/sorted?sort_dir=${direction}`);
      setFridge({ items: res.data?.items || [] });
    } catch (err) {
      console.error("Failed to load sorted fridge", err);
    }
  };

  const openModal = (item?: FridgeItem) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({ name: "", expiration_date: undefined, open_date: undefined, used: false });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
  };

  const handleAddOrUpdateItem = async () => {
    if (!formData.name.trim()) return;

    try {
      if (editingItem?.id) {
        await callApi(`/fridge/items/${editingItem.id}`, "PUT", undefined, formData);
      } else {
        await callApi("/fridge/items", "POST", undefined, formData);
      }
      await loadFridge();
      closeModal();
    } catch (err) {
      console.error("Failed to sync item", err);
    }
  };

  const handleMarkAsUsed = async (itemId: string) => {
    try {
      await callApi(`/fridge/items/${itemId}/mark-used`, "PATCH");
      await loadFridge();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "No date set";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isExpired = (dateString?: string) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  const nonUsedItems = fridge.items.filter((item) => !item.used);

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <Heading title="🧊 Fridge & Pantry" meta={[{key: "1", value: "Manage your ingredients and track expiration dates"}]} />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => openModal()} color_name="primary" className="font-bold shadow-lg shadow-primary/20">
            + Add Ingredient
          </Button>
          <div className="flex bg-surface-panel dark:bg-surface-panel-dark p-1 rounded-xl border border-border dark:border-border-dark">
            <button 
              onClick={() => loadSortedFridge("asc")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${sortDir === "asc" ? "bg-primary text-white" : "text-text-secondary"}`}
            >
              Earliest First
            </button>
            <button 
              onClick={() => loadSortedFridge("desc")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${sortDir === "desc" ? "bg-primary text-white" : "text-text-secondary"}`}
            >
              Latest First
            </button>
          </div>
        </div>
      </div>

      {/* Main List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border dark:border-border-dark pb-2">
          <h3 className="text-xl font-black tracking-tight text-text-primary dark:text-text-primary-dark">
            In Stock ({nonUsedItems.length})
          </h3>
        </div>

        <StackedList emptyMessage="Your fridge is empty. Time to go shopping!" onEmptyClick={() => openModal()}>
          {nonUsedItems.map((item) => {
            const expired = isExpired(item.expiration_date);
            return (
              <Card 
                key={item.id} 
                className={`transition-all hover:scale-[1.01] ${expired ? 'ring-2 ring-danger/30 bg-danger/5' : ''}`}
              >
                <Card.Header title={item.name}>
                  {expired ? (
                    <Pill label="Expired" variant="danger" />
                  ) : item.open_date ? (
                    <Pill label="Opened" variant="warning" />
                  ) : (
                    <Pill label="Fresh" variant="success" />
                  )}
                </Card.Header>
                
                <div className="px-4 py-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary opacity-70 font-medium">Expires:</span>
                    <span className={`font-bold ${expired ? 'text-danger' : 'text-text-primary dark:text-text-primary-dark'}`}>
                      {formatDate(item.expiration_date)}
                    </span>
                  </div>
                  {item.open_date && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary opacity-70 font-medium">Opened:</span>
                      <span className="text-text-primary dark:text-text-primary-dark">{formatDate(item.open_date)}</span>
                    </div>
                  )}
                </div>

                <Card.Footer className="flex gap-2">
                  <Button onClick={() => openModal(item)} size="small" variant="border" className="flex-1">
                    Edit
                  </Button>
                  <Button onClick={() => handleMarkAsUsed(item.id!)} size="small" className="flex-1">
                    Mark Used
                  </Button>
                </Card.Footer>
              </Card>
            );
          })}
        </StackedList>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={closeModal}>
        <div className="p-2">
          <Heading 
            title={editingItem ? "Edit Ingredient" : "Add to Fridge"} 
            meta={[{key: "1", value: "Keep track of your pantry items to reduce waste"}]}
          />
          
          <div className="space-y-4 mt-6">
            <Input
              label="Ingredient Name"
              placeholder="e.g. Greek Yogurt, Spinach..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Expiration Date"
                type="date"
                value={formData.expiration_date ? formData.expiration_date.split("T")[0] : ""}
                onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
              />
              <Input
                label="Date Opened"
                type="date"
                value={formData.open_date ? formData.open_date.split("T")[0] : ""}
                onChange={(e) => setFormData({ ...formData, open_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
              />
            </div>
          </div>

          <Modal.Footer>
            <Button onClick={handleAddOrUpdateItem} className="px-8 font-bold">
              {editingItem ? "Update Item" : "Add to Fridge"}
            </Button>
            <Button onClick={closeModal} variant="ghost" color_name="secondary">
              Cancel
            </Button>
          </Modal.Footer>
        </div>
      </Modal>
    </div>
  );
}