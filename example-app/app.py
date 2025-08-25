# pyright: basic

from react_sortable import input_react_sortable

from shiny import App, ui, render

items = [{"id": 1, "name": "Item 1"}, {"id": 2, "name": "Item 2"}, {"id": 3, "name": "Item 3"}]
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
    input_react_sortable("sortable", value=items_nested),
    ui.br(),
    ui.h2("Test output"),
    ui.output_text("test_output"),
)


def server(input, output, session):
    @render.text
    def test_output():
        print("Calculating value")
        return input.sortable()


app = App(app_ui, server, debug=True)
