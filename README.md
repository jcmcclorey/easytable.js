# EasyTable.js
EasyTable.js is a simple VanillaJS solution for adding pagination, sorting and filtering to HTML tables whether the data is loaded on page render or via AJAX.

## Installation

```bash
npm install easytable.js
```

## Usage

This example shows how to use EasyTable with AJAX, but you can also load your data with the page turn that table into an EasyTable.

```html
<div>
    <label for="limit">Per Page</label>
    <select id="limit">
        <option value="25">25</option>
        <option value="50">50</option>
        <option value="100">100</option>
        <option value="">All</option>
    </select>
</div>
<div>
    <table id="dataTable">
        <thead class="cm_blue">
            <tr>
                <th class="et-sortable" data-column="name">Name</th>
                <th class="et-sortable" data-column="phone_number">Phone Number</th>
                <th class="et-sortable" data-column="datetime">Date</th>
                <th>Time</th>
            </tr>
        </thead>
        <tbody></tbody>
        <tfoot>
            <tr>
                <td>
                    <div>
                        <p id="page_view_count"></p>
                    </div>
                    <div id="pagination_container"></div>
                </td>
            </tr>
        </tfoot>
    </table>
</div>
```

```javascript
window.EasyTable = require('./easytable.js');

let easyTable = new EasyTable('#dataTable', {
    ajax: {
        url: 'url',
        type: 'POST',
        data: {},
        emptyText: 'No Data Found',
        columns: [
            //...
        ],
        handlers: {
            error: function(xhr, status, error) {
                //...
            },
            success: function(result) {
                //...
            },
        },
    },
    countText: 'Showing {PF} - {PL} of {TR} items',
    countTextContainer: '#page_view_count',
    dataType: 'ajax',
    pageSize: $('#limit').val(),
    pageSizeSelector: '#limit',
    pagination: true,
    paginationContainer: '#pagination_container',
    paginationSideLinks: 3,
    sortingIcons: {
        none: 'fas fa-sort',
        asc: 'fas fa-sort-down',
        desc: 'fas fa-sort-up',
    },
    stickyHeader: true,
    stickyHeaderTop: function(element) {
        //
    },
    sorting: true,
});
```

## Options

| Name | Type | Default | Description |
| ----- | ----- | ----- | ----- |
| ajax.columns | array | [] | list of data properties in the order it will be displayed in the table |
| ajax.data | object | {} | AJAX request data |
| ajax.emptyText | string | "No Records Found" | message shown when no data in table |
| ajax.handlers.error | function | function(xhr, error, status) | AJAX error handler |
| ajax.handlers.success | function | function(result) | AJAX success handler |
| ajax.sorting.column | string | "" | column to sort on; from ajax.columns |
| ajax.sorting.desc | boolean | false | sorting direction |
| ajax.type | string | "GET" | type of request; supports GET and POST |
| ajax.url | string | "" | request URL |
| countText | string | "Showing {PF} - {PL} of {TR} rows" | pagination count text |
| countTextContainer | string | "" | identifier for count text container |
| dataType | string | "html" | data source ("html", "ajax") |
| filtering | boolean | false | enables filtering |
| filteringInput | string | "" | `<input/>` element for filtering table data |
| filteringTrigger | string | "" | element that triggers filtering, only supports `buttons`, defaults to input's `input` event |
| pageActive | integer | 1 | which page to start on |
| pageSize | integer | 10 | page size, set to `null` to display all data on 1 page |
| pageSizeSelector | string | "" | identifier of element that triggers changing the page size, can be any element that triggers a `change` event, a `<select>` element is suggested |
| pagination | boolean | false | enables pagination |
| paginationContainer | string | "" | identifier for pagination container |
| paginationNext.arrow | string/function | "&raquo;" | next page button icon |
| paginationPrevious.arrow | string/function | "&laquo;" | previous page button icon |
| paginationSideLinks | integer | null | number of buttons to show on each side of active page |
| stickyHeader | boolean | false | stick header to top of page on table scroll |
| stickyHeaderTop | string/function | "" | distance from the top of the page the header is allowed or a function to modify the `<th>`s |
| sorting | boolean | false | enables sorting |
| sortingIcons.none | string/function | "" | icon for no sorting |
| sortingIcons.asc | string/function | "" | icon for ASC sorting |
| sortingIcons.desc | string/function | "" | icon for DESC sorting |

## Methods

`EasyTable.getCurrentPage()`: returns the current page

`EasyTable.setCurrentPage(page = 1)`: sets the current page (defaults to 1), call `EasyTable.refresh()` after calling this

`EasyTable.getProperties()`: gets the current properties of the current instance of EasyTable

`EasyTable.loadPage(page = null, reset_sort = false)`: loads a page via AJAX (page = null will load page 1)

`EasyTable.refresh()`: redraws EasyTable


## Miscellaneous

### `countText` Placeholders
| Placeholder | Value |
| ----- | ----- |
| {CP} | current page number |
| {TP} | total pages |
| {PF} | position first record on current page |
| {PL} | position last record on current page |
| {TR} | total records |

## Notes

> add the class `.et-sortable` to `<th>`s to make a column sortable

> add the class `.et-filter` to `<th>`s to allow filtering on a column

> add `data-column` attribute with value of column to `<th>`s when sorting via AJAX