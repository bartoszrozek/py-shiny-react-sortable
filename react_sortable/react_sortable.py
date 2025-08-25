from pathlib import PurePath
import json

from htmltools import HTMLDependency, Tag

from shiny.module import resolve_id

# This object is used to let Shiny know where the dependencies needed to run
# our component all live. In this case, we're just using a single javascript
# file but we could also include CSS.
react_sortable_deps = HTMLDependency(
    "react_sortable",
    "1.0.0",
    source={
        "package": "react_sortable",
        "subdir": str(PurePath(__file__).parent / "distjs"),
    },
    script={"src": "index.js", "type": "module"},
)

def input_react_sortable(id: str, items: list[dict[str, str]] | None = None):
    """
    A shiny input.
    """

    # Fail fast
    if items is None:
        raise ValueError("You must provide an `items` argument.")

    return Tag(
        "react-sortable-input",
        react_sortable_deps,
        id=resolve_id(id),
        initialValue=json.dumps(items),
    )