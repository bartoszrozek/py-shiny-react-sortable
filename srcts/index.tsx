import { useState, useEffect } from "react";
import { ReactSortable } from "react-sortablejs";

interface ItemType {
  id: number;
  name: string;
  children?: ItemType[];
}

import { makeInputBinding } from "@posit-dev/shiny-bindings-core";
import { createRoot } from "react-dom/client";

// Generates a new input binding that renders the supplied react component
// into the root of the webcomponent.
// Use a custom input binding that reads an `initialValue` attribute from the
// DOM element (this allows the Python `Tag(..., initialValue=...)` to pass
// JSON which we parse here). If the attribute isn't present we fall back to
// the built-in default array.
makeInputBinding({
  name: "react-sortable-input",
  selector: "react-sortable-input",
  setup: (el: HTMLElement, updateValue: (v: any, deferred?: boolean) => void) => {
    // Try a few attribute name variants (HTML attributes are usually lowercased)
    const raw =
      el.getAttribute("initialValue") || el.getAttribute("initialvalue") || el.getAttribute("data-initial-value");

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

    // Inform Shiny about the initial value
    updateValue(parsedInitial);

    // Render the React component into the custom element's root
    createRoot(el).render(
      <SortableInput initialValue={parsedInitial} updateValue={(x: ItemType[]) => updateValue(x)} />
    );
  },
});

// Extracted SortableInput component
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

  // immutably replace the list at the given path (pathIds is array of item ids)
  const updateListAtPath = (prev: ItemType[], pathIds: number[], newList: ItemType[]): ItemType[] => {
    const copy: ItemType[] = JSON.parse(JSON.stringify(prev));
    if (pathIds.length === 0) {
      return newList;
    }
    let cur: any = copy;
    for (let i = 0; i < pathIds.length; i++) {
      const id = pathIds[i];
      const itemIdx = cur.findIndex((it: ItemType) => it.id === id);
      if (itemIdx === -1) return prev;
      if (i === pathIds.length - 1) {
        cur[itemIdx].children = newList;
        return copy;
      }
      cur[itemIdx].children = cur[itemIdx].children || [];
      cur = cur[itemIdx].children;
    }
    return copy;
  };

  const onListChange = (pathIds: number[], newList: ItemType[]) => {
    setItems((prev) => updateListAtPath(prev, pathIds, newList));
  };

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

      setItems((prev) => {
        const copy: ItemType[] = JSON.parse(JSON.stringify(prev));

        const fromList = getListAtPath(copy, fromPath);
        const toList = getListAtPath(copy, toPath);

        // find and remove the moved item from the fromList at oldIndex
        const removed = fromList.splice(oldIndex, 1);
        if (removed.length === 0) return prev;
        const moved = removed[0];

        // if source and target are same list and removal occurred before target
        // index, adjust the insertion index
        if (fromList === toList && oldIndex < newIndex) {
          newIndex = newIndex - 1;
        }

        toList.splice(newIndex, 0, moved);
        return copy;
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("handleEnd error", e, evt);
    }
  };

  // recursive renderer: each list is a ReactSortable with group 'nested'
  const renderList = (list: ItemType[], pathIds: number[]) => (
    <ReactSortable
      list={[...list]}
      // we handle mutations via onEnd to compute stable id-paths from the DOM
      // (react-sortablejs may call setList with an incomplete context), so make
      // setList a no-op here and use the onEnd handler below.
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
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
            <span>{item.name}</span>
          </div>
          <div style={{ marginLeft: 16, marginTop: 8 }}>{renderList(item.children || [], [...pathIds, item.id])}</div>
        </div>
      ))}
    </ReactSortable>
  );

  // mark the top-level container so DOM-path traversal knows where to stop
  return <div data-root="true">{renderList(items, [])}</div>;
}
