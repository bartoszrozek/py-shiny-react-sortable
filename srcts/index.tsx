import { useEffect, useState } from "react";
import { ReactSortable } from "react-sortablejs";

import { makeInputBinding } from "@posit-dev/shiny-bindings-core";
import { createRoot } from "react-dom/client";

interface ItemType {
  id: number;
  name: string;
  children?: ItemType[];
}

// Generates a new input binding that renders the supplied react component
// into the root of the webcomponent.
// Use a custom input binding that reads an `initialValue` attribute from the
// DOM element (this allows the Python `Tag(..., initialValue=...)` to pass
// JSON which we parse here). If the attribute isn't present we fall back to
// the built-in default array.
makeInputBinding({
  name: "react-sortable-input",
  selector: "react-sortable-input",
  setup: (
    el: HTMLElement,
    updateValue: (v: any, deferred?: boolean) => void
  ) => {
    // Try a few attribute name variants (HTML attributes are usually lowercased)
    const raw =
      el.getAttribute("initialValue") ||
      el.getAttribute("initialvalue") ||
      el.getAttribute("data-initial-value");

    let parsedInitial: ItemType[] = [];

    if (raw) {
      try {
        parsedInitial = JSON.parse(raw);
      } catch (e) {
        // If JSON parse fails, leave the fallback and log for debugging
        // eslint-disable-next-line no-console
        console.error("Failed to parse initialValue on element", raw, e);
      }
    }

    // Set the initial value from Python
    updateValue(parsedInitial);

    createRoot(el).render(
      <SortableInput
        initialValue={parsedInitial}
        updateValue={updateValue}
      />
    );
  },
});

function SortableInput({
  initialValue,
  updateValue,
}: {
  initialValue: ItemType[];
  updateValue: (x: ItemType[]) => void;
}) {
  const [items, setItems] = useState<ItemType[]>(initialValue);

  // keep internal state in sync if initialValue changes
  useEffect(() => {
    setItems(initialValue);
  }, [initialValue]);

  // notify Shiny about list changes
  useEffect(() => {
    updateValue(items);
  }, [items, updateValue]);


  // Helper: return reference to the array at a given id-path inside `copy`
  const getListAtPath = (root: ItemType[], path: number[]): ItemType[] => {
    let cur: any = root;
    for (let i = 0; i < path.length; i++) {
      const id = path[i];
      const idx = cur.findIndex((it: ItemType) => it.id === id);
      if (idx === -1) return cur;
      cur[idx].children = cur[idx].children || [];
      cur = cur[idx].children;
    }
    return cur;
  };

  const handleEnd = (evt: any) => {
    console.log("handleEnd", evt);
    try {
      const computePath = (el: HTMLElement) => {
        const path: number[] = [];
        let cur: HTMLElement | null = el as HTMLElement | null;
        while (cur && !cur.hasAttribute("data-root")) {
          if (cur.dataset && cur.dataset.id) {
            // prepend so path is ordered root -> ... -> parent
            path.unshift(Number(cur.dataset.id));
          }
          cur = cur.parentElement;
        }
        return path;
      };

      const fromPath = computePath(evt.from as HTMLElement);
      const toPath = computePath(evt.to as HTMLElement);
      const oldIndex = typeof evt.oldIndex === "number" ? evt.oldIndex : 0;
      let newIndex = typeof evt.newIndex === "number" ? evt.newIndex : 0;
      console.log("fromPath", fromPath, "toPath", toPath, oldIndex, newIndex);

      setItems((prev) => {
        const copy: ItemType[] = JSON.parse(JSON.stringify(prev));

        const fromList = getListAtPath(copy, fromPath);
        const toList = getListAtPath(copy, toPath);

        // find and remove the moved item from the fromList at oldIndex
        const removed = fromList.splice(oldIndex, 1);
        if (removed.length === 0) return prev;
        const moved = removed[0];

        toList.splice(newIndex, 0, moved);
        return copy;
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("handleEnd error", e, evt);
    }
  };

  const renderList = (list: ItemType[], pathIds: number[]) => (
    <ReactSortable
      list={[...list]}
      setList={() => {}}
      onEnd={(evt: any) => handleEnd(evt)}
      group="nested"
      animation={150}
      fallbackOnBody={true}
      className="shiny-input-container list-group"
    >
      {list.map((item) => (
        <div
          key={item.id}
          data-id={item.id}
          role="listitem"
          className="list-group-item d-flex flex-column"
          style={{ cursor: "move" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <span>{item.name}</span>
          </div>
          <div style={{ marginLeft: 16, marginTop: 8 }}>
            {renderList(item.children || [], [...pathIds, item.id])}
          </div>
        </div>
      ))}
    </ReactSortable>
  );

  return <div data-root="true">{renderList(items, [])}</div>;
}
