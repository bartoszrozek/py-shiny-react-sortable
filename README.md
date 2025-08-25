
# ReactSortable for Shiny (Python)

A sortable list component for [Shiny for Python](https://shiny.posit.co/py/) using React and [SortableJS](https://github.com/SortableJS/SortableJS).

## Features
- Drag-and-drop sorting of list items
- Nested sortable lists

## Installation

You can install directly from GitHub using pip:

```bash
pip install git+https://github.com/bartoszrozek/py-shiny-react-sortable.git
```

Or add to your `requirements.txt`:

```
git+https://github.com/bartoszrozek/py-shiny-react-sortable.git
```

## Usage

1. Import and use the component in your Shiny app:

```python
from react_sortable import input_react_sortable

from shiny import App, ui, render

# Example usage in a Shiny UI
items_nested = [
    {
        "id": 1,
        "name": "Item 1",
        "children": [{"id": 4, "name": "Item 1.1"}, {"id": 5, "name": "Item 1.2"}],
    },
    {"id": 2, "name": "Item 2"},
    {
        "id": 3,
        "name": "Item 3",
        "children": [{"id": 6, "name": "Item 3.1"}, {"id": 7, "name": "Item 3.2"}],
    },
]
app_ui = ui.page_fluid(
    ui.h2("React Sortable Input"),
    input_react_sortable("sortable-list", items=items_nested),
)

```

2. Access the sorted list in your server logic using the input id:

```python
@reactive.Effect
def _():
	print(input["sortable-list"])
```

## Showcase

https://github.com/user-attachments/assets/d9f1880f-cbf0-4be1-9d4d-a9c95f72b06a

## License

MIT

