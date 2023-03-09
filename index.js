'use strict';

/**
 * intended as an all-encompasing easily-customizable table handler;
 * currently handles:
 *  - pagination for HTML
 *  - sorting for HTML
 *  - filtering for HTML
 *
 * future development
 *  - support for ajax in all 3 phases (pagination, sorting, filtering)
 * 
 * classes
 *  - .et-filter => apply to `<th>` on filterable columns
 *  - .et-sortable => apply to `<th>` on sortable columns
 *
 * @param {Object} options
 */
var EasyTable = (function() {
    /**
     * element
     */
    let $element;

    /**
     * events
     */
    const $events = {
        pageNext: 'et.page_next',
        pageSelect: 'et.page_select',
    };

    let $_init = true;

    /**
     * - ajax
     *      - columns
     *      - data
     *      - type
     *      - url
     * - countText - text showing how many records are visible; see paginationDrawCount() for more details
     * - countTextContainer - HTML element container for countText
     * - dataType - how the data is retrieved [html, ajax]
     * - filtering - is filtering enabled => use `th.et-filter`
     * - filteringInput - HTML element changing the filter values
     * - filteringTrigger - HTML element that triggers filtering to run; if left blank will trigger after 1 second
     * - pageActive - current visible page
     * - pageSize - size of each page
     * - pageSizeSelector - HTML element that can change pageSize
     * - pagination - is pagination enabled
     * - paginationContainer - HTML element container for pagination links
     * - paginationNext - string to use for pagination next page
     *      - arrow
     * - paginationPrevious - string to use for pagination previous page
     *      - arrow
     * - paginationSideLinks - number of links to show on the side of the active pagination link
     * - sorting - is sorting enabled => use `th.et-sortable`
     * - sortingIcons - icons to use in a sortable column's header
     *      - none - no sorting
     *      - asc - sorting ascending
     *      - desc - sorting descending
     */
    let $properties = {
        ajax: {
            columns: [],
            data: {},
            emptyText: 'No Records Found',
            handlers: {
                error: function(xhr, error, status) {},
                success: function(result) {},
            },
            options: {},
            sorting: {
                column: '',
                desc: false,
            },
            type: 'GET',
            url: '',
        },
        countText: "Showing {PF} - {PL} of {TR} rows",
        countTextContainer: '',
        dataType: 'html',
        filtering: false,
        filteringInput: '',
        filteringTrigger: '',
        pageActive: 1,
        pageSize: 10,
        pageSizeSelector: '',
        pagination: false,
        paginationContainer: '',
        paginationNext: {
            arrow: '&raquo;',
        },
        paginationPrevious: {
            arrow: '&laquo;',
        },
        paginationSideLinks: null,
        stickyHeader: false,
        stickyHeaderTop: '',
        sorting: false,
        sortingIcons: {
            none: '',
            asc: '',
            desc: '',
        },
    };

    /**
     * constructor
     * 
     * @param {String} selector
     * @param {Object} options
     */
    function EasyTable(selector, options = []) {
        init(selector, options);
    }

    /**
     * get the current page
     * 
     * @returns {Number}
     */
    EasyTable.prototype.getCurrentPage = () => pagination.getPage();

    /**
     * set the current page
     * 
     * @param {Number} page
     */
    EasyTable.prototype.setCurrentPage = (page = 1) => {
        if ($properties.pagination) pagination.setPage(page);
    };

    /**
     * get properties
     * 
     * @returns {Object}
     */
    EasyTable.prototype.getProperties = () => $properties;

    /**
     * load a page
     * 
     * @param {Number}  page
     * @param {Boolean} reset_sort
     */
    EasyTable.prototype.loadPage = (page = null, reset_sort = false) => ajax.loadPage(page, reset_sort);

    /**
     * refresh EasyTable
     */
    EasyTable.prototype.refresh = () => {
        if (Math.ceil(pagination.getRowsLength() / pagination.getPageSize()) < pagination.getPage()) {
            pagination.setPage(Math.floor(pagination.getRowsLength() / pagination.getPageSize()))
        }

        pagination.setPageCount();
        pagination.drawPage();
        pagination.draw();
        pagination.drawCount();
    };

    let tools = {
        buildIcon: (icon) => {
            if (typeof icon == 'function') {
                return icon();
            } else if (typeof icon == 'string') {
                if (tools.isValidHTML(icon) || icon.startsWith('&')) {
                    return icon;
                } else {
                    return `<i class="${icon}"></i>`;
                }
            } else {
                return '';
            }
        },
        hideElement: (element) => element.style.display = 'none',
        hideElements: (elements) => {
            for (let i = 0; i < elements.length; i++) {
                tools.hideElement(elements[i]);
            }
        },
        elementIs: (element, node_name) => element.nodeName == node_name,
        isAjax: () => $properties.dataType == 'ajax',
        isButton: (element) => tools.elementIs(element, 'BUTTON'),
        isEmpty: () => {
            let empty = false;

            if (tools.isAjax() && tools.isTable($element)) {
                empty = $element.querySelector('tbody > tr > td:first-child').innerText == $properties.ajax.emptyText;
            }

            return empty;
        },
        isInputText: (element) => tools.elementIs(element, 'INPUT') && element.type.toUpperCase() == 'TEXT',
        isSelect: (element) => tools.elementIs(element, 'SELECT'),
        isTable: (element) => tools.elementIs(element, 'TABLE'),
        isValidHTML: (str) => /<(?=.*? .*?\/ ?>|br|hr|input|!--|wbr)[a-z]+.*?>|<([a-z]+).*?<\/\1>/i.test(str),
        loadingOverlay: (status, container_height = '350px', color = 'gray') => {
            const $class = 'loading-overlay';
            const $container_id = '_et_spinner_container';

            if (status == 'start') {
                let div = $element.querySelector(`.${$class}`);
                if (div == null) {
                    div = document.createElement('div');
                    div.classList.add($class);
                    div.style.height = container_height;
                    div.style.minHeight = '150px';
                    div.style.position = 'relative';

                    // TODO: use device width to determine width and height
                    // @credit => https://www.benmvp.com/blog/how-to-create-circle-svg-gradient-loading-spinner/
                    div.innerHTML = [
                        `<div style="top: 50%; left: 50%; position: absolute; transform: translate(-50%, -50%); -ms-transform: translate(-50%, -50%);">`,
                            `<div id="${$container_id}">`,
                                `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 200 200" fill="none" color="${color}">`,
                                    '<defs>',
                                        '<linearGradient id="spinner-secondHalf">',
                                            '<stop offset="0%" stop-opacity="0" stop-color="currentColor" />',
                                            '<stop offset="100%" stop-opacity="0.5" stop-color="currentColor" />',
                                        '</linearGradient>',
                                        '<linearGradient id="spinner-firstHalf">',
                                            '<stop offset="0%" stop-opacity="1" stop-color="currentColor" />',
                                            '<stop offset="100%" stop-opacity="0.5" stop-color="currentColor" />',
                                        '</linearGradient>',
                                    '</defs>',
                                    '<g stroke-width="8">',
                                        '<path stroke="url(#spinner-secondHalf)" d="M 4 100 A 96 96 0 0 1 196 100" />',
                                        '<path stroke="url(#spinner-firstHalf)" d="M 196 100 A 96 96 0 0 1 4 100" />',
                                        '<path stroke="currentColor" stroke-linecap="round" d="M 4 100 A 96 96 0 0 1 4 98" />',
                                    '</g>',
                                    '<animateTransform from="0 0 0" to="360 0 0" attributeName="transform" type="rotate" repeatCount="indefinite" dur="1300ms" />',
                                '</svg>',
                            '</div>',
                        '</div>'
                    ].join('');

                    if (tools.isTable($element)) {
                        let td = document.createElement('td');
                        td.setAttribute('colspan', 100);
                        td.appendChild(div);
                        td.style.padding = 'unset';

                        let tr = document.createElement('tr');
                        tr.appendChild(td);

                        $element.querySelector('tbody').replaceChildren(tr);

                        document.getElementById($container_id).animate(
                            [
                                {
                                    transform: 'rotate(360deg)',
                                }
                            ],
                            {
                                duration: 1300,
                                iterations: Infinity,
                            }
                        );
                    }
                }
            } else if (status == 'stop') {
                let div = $element.querySelector(`.${$class}`);
                if (div != null) div.remove();
            }
        },
        mergeProperties: (properties, options) => {
            for (const o in options) {
                switch (o) {
                    case 'ajax':
                    case 'paginationNext':
                    case 'paginationPrevious':
                    case 'sortingIcons':
                        for (const k in options[o]) {
                            properties[o][k] = options[o][k];
                        }
                        break;
                    case 'dataType':
                        let data_types = ['html', 'ajax'];
                        properties[o] = data_types.includes(options[o]) ? options[o] : data_types[0];
                    case 'pageActive':
                        let value = parseInt(options[o]);
                        if (!isNaN(value)) properties[o] = value;
                    case 'pageSize':
                        properties[o] = parseInt(options[o]);
                    default:
                        properties[o] = options[o];
                        break;
                }
            }

            const style = window.getComputedStyle($element.querySelector('thead th:first-child'));

            for (const dir in properties.sortingIcons) {
                if (typeof properties.sortingIcons[dir] == 'string' && !properties.sortingIcons[dir].length) {
                    properties.sortingIcons[dir] = tools.sorting.defaultIcon(
                        dir,
                        style.getPropertyValue('color'),
                        Number(style.getPropertyValue('font-size').replace('px', '')) / 2
                    );
                }
            }

            return properties;
        },
        pagination: {
            drawCount: (page_start, page_end, total) => {
                let count_text = $properties.countText;
                count_text = count_text.replace('{CP}', $properties.pageActive);
                count_text = count_text.replace('{TP}', pagination.page_count);
                count_text = count_text.replace('{PF}', page_start);
                count_text = count_text.replace('{PL}', page_end);
                count_text = count_text.replace('{TR}', total);

                if (!page_end) {
                    tools.hideElement($element.querySelector($properties.countTextContainer));
                } else {
                    $element.querySelector($properties.countTextContainer).innerText = count_text;
                    tools.showElement($element.querySelector($properties.countTextContainer));
                }
            },
            onClick: (event) => {
                event.preventDefault();

                if (!event.target.closest('li.page-item').classList.contains('active')) {
                    if (isNaN(event.target.dataset.page)) {
                        pagination.setPage((event.target.dataset.page == 'next') ? $properties.pageActive + 1 : $properties.pageActive - 1);
                    } else {
                        pagination.setPage(event.target.dataset.page);
                    }

                    pagination.drawPage();

                    if ($properties.paginationSideLinks > 0) {
                        pagination.draw();
                    } else {
                        document.querySelector($properties.paginationContainer).querySelectorAll('li.page-item.active').forEach(e => e.classList.remove('active'));
                        document.querySelector(`a.page-link[data-page="${$properties.pageActive}"]`).closest('li.page-item').classList.add('active');
                        event.target.dispatchEvent(new Event($events.pageSelect));
                    }

                    pagination.drawCount();
                }
            },
            onClickAjax: (event) => {
                event.preventDefault();

                if (!event.target.closest('li.page-item').classList.contains('active')) {
                    let page = event.target.dataset.page;
                    if (isNaN(event.target.dataset.page)) {
                        page = event.target.dataset.page == 'next' ? $properties.pageActive + 1 : $properties.pageActive - 1;
                    }

                    ajax.loadPage(page);
                }
            },
        },
        showElement: (element) => element.style.display = null,
        showElements: (elements) => {
            for (let i = 0; i < elements.length; i++) {
                tools.showElement(elements[i]);
            }
        },
        showEmpty: () => {
            if (tools.isTable($element)) {
                $element.querySelector('tbody').innerHTML = [
                    `<tr>`,
                        `<td style="text-align: center;" colspan="18">${$properties.ajax.emptyText}</td>`,
                    `</tr>`
                ].join('');
            }
        },
        sorting: {
            defaultIcon: (direction, color = 'black', font_size = 7) => {
                let template = `<span style="width: 0; height: 0; display: inline-block; border: ${font_size}px solid transparent; border-$1-color: ${color};"></span>`;
                let top = parseInt(font_size) - 1;

                if (direction == 'asc') {
                    return [
                        `<div style="width: fit-content; height: 0px; position: relative; top: ${top}px; display: inline-block;">`,
                            template.replace('$1', 'top'),
                        '</div>',
                    ].join('');
                } else if (direction == 'desc') {
                    return [
                        `<div style="width: fit-content; height: 0px; position: relative; top: -3px; display: inline-block;">`,
                            template.replace('$1', 'bottom'),
                        '</div>',
                    ].join('');
                } else {
                    return [
                        `<div style="display: inline-flex; height: ${font_size * 2}px; align-content: baseline; flex-flow: column;">`,
                            `<div style="width: fit-content; height: 0px; position: relative; top: ${(top + 1) * -1}px;">`,
                                template.replace('$1', 'bottom'),
                            '</div>',
                            `<div style="width: fit-content; height: 0px; position: relative; top: ${((top + 1) * -1) + (parseInt(font_size) * 2) + 2}px;">`,
                                template.replace('$1', 'top'),
                            '</div>',
                        '</div>',
                    ].join('');
                }
            },
            getIcon: (type) => tools.buildIcon($properties.sortingIcons[['asc', 'desc', 'none'].includes(type) ? type : 'none']),
            onClick: (event, element) => {
                let th = tools.elementIs(event.target, 'TH') ? event.target : event.target.closest('th.et-sortable');
                let descending = th.dataset.ascending == 0;

                tools.sorting.updateIcons(event, !descending);

                Array.prototype.slice.call(pagination.getRows()).sort(
                    sorting.comparer(Array.prototype.indexOf.call($element.querySelectorAll('thead > tr > th'), element), !descending)
                ).forEach(function(tr) {
                    $element.querySelector('tbody').appendChild(tr);
                });

                pagination.drawPage();

                th.dataset.ascending = (!descending ? 0 : 1);
            },
            onClickAjax: (event) => {
                if (!tools.isEmpty()) {
                    let th = tools.elementIs(event.target, 'TH') ? event.target : event.target.closest('th.et-sortable');
                    let descending = th.dataset.ascending == 0;

                    tools.sorting.updateIcons(event, !descending);

                    ajax.sorting.set(th.dataset.column, descending);
                    ajax.loadPage(1);

                    th.dataset.ascending = (!descending ? 0 : 1);
                }
            },
            updateIcons: (event, ascending) => {
                let th = tools.elementIs(event.target, 'TH') ? event.target : event.target.closest('th.et-sortable');

                $element.querySelectorAll('thead > tr > th.et-sortable').forEach(e => {
                    e.querySelector('span.et-table-sort').innerHTML = tools.sorting.getIcon('none');
                });

                th.querySelector('span.et-table-sort').innerHTML = tools.sorting.getIcon(ascending ? 'asc' : 'desc');
            },
        },
    };

    /******** PAGINATION ********/

    let pagination = {
        page_count: 1,
        getRows: () => tools.isTable($element) ? $element.querySelectorAll(`tbody tr:not(.et-filtered)`) : [],
        getRowsLength: () => pagination.getRows().length,
        getPage: () => $properties.pageActive,
        getPageSize: () => $properties.pageSize,
        getPageStart: () => (!$properties.pagination || isNaN(pagination.getPageSize())) ? 1 : (($properties.pageActive - 1) * pagination.getPageSize()) + 1,
        getPageEnd: () => (!$properties.pagination || isNaN(pagination.getPageSize())) ? pagination.getRowsLength() : (pagination.getPageStart() + pagination.getPageSize()) - 1,
        setPage: (page = null) => {
            $properties.pageActive = Math.max(1, Math.min(pagination.page_count, (isNaN(page) || page < 1) ? 1 : Math.max(page, 1)));
        },
        setPageCount: (page_count = null) => {
            if (tools.isAjax()) {
                pagination.page_count = !isNaN(page_count) ? page_count : 1;
            } else {
                pagination.page_count = isNaN(pagination.getPageSize()) ? 1 : Math.ceil(pagination.getRowsLength() / pagination.getPageSize());
            }
        },
        draw: () => {
            if (pagination.page_count > 1) {
                let inner_html = [
                    '<ul id="et-pagination" class="pagination">',
                    '<li class="page-item">',
                        '<a class="page-link" href="#" aria-label="Previous" data-page="prev">',
                            `<span aria-hidden="true">${tools.buildIcon($properties.paginationPrevious.arrow)}</span>`,
                        '</a>',
                    '</li>',
                ];

                if ($properties.pageActive > pagination.page_count) pagination.setPage(pagination.page_count);

                if (!isNaN($properties.paginationSideLinks) && $properties.paginationSideLinks > 0 && pagination.page_count > ($properties.paginationSideLinks + 3)) {
                    let side_links = {
                        start: $properties.pageActive - $properties.paginationSideLinks,
                        end: $properties.pageActive + $properties.paginationSideLinks,
                    };

                    if (side_links.start <= 0) {
                        side_links.end += (Math.abs(side_links.start) + 1)
                        side_links.start = 1;
                    } else if (side_links.end > pagination.page_count - 1) {
                        side_links.start -= (side_links.end - pagination.page_count);
                        side_links.end = pagination.page_count;
                    }

                    for (let i = 1; i <= pagination.page_count; i++) {
                        if (i == 1 || i == pagination.page_count || (i >= side_links.start && i <= side_links.end)) {
                            inner_html.push(
                                `<li class="page-item ${(i == $properties.pageActive ? 'active' : '')}">`,
                                    `<a class="page-link" href="#" data-page="${i}">${i}</a>`,
                                '</li>'
                            );
                        } else {
                            if (i < side_links.start || i > side_links.end) {
                                inner_html.push(
                                    '<li class="page-item disabled">',
                                        '<a class="page-link" href="#" tabindex="-1" aria-disabled="true">...</a>',
                                    '</li>'
                                );

                                if (i < side_links.start) {
                                    i = side_links.start - 1;
                                } else if (i > side_links.end) {
                                    i = Math.max(1, pagination.page_count - 1);
                                }
                            }
                        }
                    }
                } else {
                    for (let i = 1; i <= pagination.page_count; i++) {
                        inner_html.push(
                            `<li class="page-item ${(i == $properties.pageActive ? 'active' : '')}">`,
                                `<a class="page-link" href="#" data-page="${i}">${i}</a>`,
                            '</li>'
                        );
                    }
                }

                inner_html.push(
                    '<li class="page-item">',
                        '<a class="page-link" href="#" aria-label="Next" data-page="next">',
                            `<span aria-hidden="true">${tools.buildIcon($properties.paginationNext.arrow)}</span>`,
                        '</a>',
                    '</li>',
                    '</ul>'
                );

                $element.querySelector($properties.paginationContainer).innerHTML = inner_html.join('');

                if (tools.isAjax()) {
                    $element.querySelectorAll('a.page-link').forEach(element => {
                        element.addEventListener('click', (event) => {
                            tools.pagination.onClickAjax(event)
                        });
                    });
                } else {
                    $element.querySelectorAll('a.page-link').forEach(element => {
                        element.addEventListener('click', (event) => {
                            tools.pagination.onClick(event)
                        });
                    });
                }
            } else {
                document.querySelector($properties.paginationContainer).innerHTML = '';
            }
        },
        drawCount: () => {
            tools.pagination.drawCount(
                pagination.getPageStart(),
                Math.min(pagination.getPageEnd(), pagination.getRowsLength()),
                pagination.getRowsLength()
            );
        },
        drawPage: () => {
            if (tools.isTable($element) && !tools.isAjax()) {
                if (!$_init) {
                    tools.hideElements($element.querySelectorAll('tbody tr'));
                    tools.showElements(Array.from($element.querySelectorAll('tbody tr:not(.et-filtered')).slice(pagination.getPageStart() - 1, pagination.getPageEnd()));
                } else {
                    tools.hideElements(Array.from($element.querySelectorAll('tbody tr:not(.et-filtered')).slice(pagination.getPageEnd()));
                }
            }
        },
        init: () => {
            if ($properties.pagination) {
                pagination.setPageCount();
                pagination.drawPage();
                pagination.draw();
                pagination.drawCount();

                if ($properties.pageSizeSelector.length) {
                    let page_size_selector = document.querySelector($properties.pageSizeSelector);
                    if (tools.isSelect(page_size_selector)) {
                        page_size_selector.addEventListener('change', (event) => {
                            let page_size = parseInt(event.target.value);

                            if (tools.isAjax()) {
                                $properties = tools.mergeProperties($properties, {
                                    pageSize: isNaN(page_size) ? '' : page_size
                                });

                                if (!tools.isEmpty()) ajax.loadPage(1);
                            } else {
                                $properties = tools.mergeProperties($properties, {
                                    pageSize: isNaN(page_size) ? pagination.getRowsLength() : page_size
                                });

                                pagination.setPage(1);
                                pagination.setPageCount();
                                pagination.drawPage();
                                pagination.draw();
                                pagination.drawCount();
                            }
                        });
                    }
                }
            }
        },
    };

    /******** SORTING ********/

    let sorting = {
        getCellValue: (tr, index) => {
            let value = tr.children[index].innerText || tr.children[index].textContent;
            return value.replace(/\s+/g, ' ').trim();
        },
        comparer: (index, asc) => {
            return (a, b) => {
                return function(v1, v2) {
                    return v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2);
                }(sorting.getCellValue(asc ? a : b, index), sorting.getCellValue(asc ? b : a, index));
            }
        },
        init: () => {
            if ($properties.sorting) {
                if (tools.isTable($element)) {
                    $element.querySelectorAll('thead > tr > th.et-sortable').forEach(element => {
                        element.style.cursor = 'pointer';
                        element.innerHTML = element.innerHTML + `<span class="et-table-sort" style="margin-left: 5px;">${tools.sorting.getIcon('none')}</span>`;

                        if (tools.isAjax()) {
                            element.addEventListener('click', (event) => {
                                tools.sorting.onClickAjax(event);
                            });
                        } else {
                            element.addEventListener('click', (event) => {
                                tools.sorting.onClick(event, element);
                            });
                        }
                    });
                }
            }
        },
        reset: () => {
            $element.querySelectorAll('thead > tr > th.et-sortable').forEach(e => {
                e.querySelector('span.et-table-sort').innerHTML = tools.sorting.getIcon();
                e.dataset.ascending = '1';
            });
        },
    };

    /******** FILTERING ********/

    let filtering = {
        columns: [],
        timer_name: 'et-run-filter',
        run: () => {
            let value = document.querySelector($properties.filteringInput).value;

            if (tools.isTable($element)) {
                if (value.length) {
                    $element.querySelectorAll('tbody tr').forEach(element => {
                        let result = false;
                        let loop_stop = false;

                        element.querySelectorAll('td').forEach((e, i) => {
                            if (loop_stop) return;

                            if (Object.keys(filtering.columns).includes(i.toString())) {
                                let text = e.innerText.toString().trim().toLowerCase();

                                if (filtering.columns[i.toString()].hasOwnProperty('type')) {
                                    switch (filtering.columns[i.toString()].type) {
                                        case 'phone_number':
                                            text = text.replace(/\D/g, '');
                                            break;
                                        default:
                                            break;
                                    }
                                }

                                result = text.includes(value.toString().toLowerCase());

                                if (result) loop_stop = true;
                            }
                        });

                        if (result) {
                            element.classList.remove('et-filtered');
                        } else {
                            element.classList.add('et-filtered');
                        }
                    });
                } else {
                    $element.querySelectorAll('tbody tr').forEach(e => e.classList.remove('et-filtered'));
                }
            }
        },
        init: () => {
            if ($properties.filtering) {
                if (tools.isTable($element)) {
                    filtering.columns = [];
                    $element.querySelectorAll('thead th').forEach((element, index) => {
                        if (element.classList.contains('et-filter')) {
                            filtering.columns[index] = {
                                type: element.dataset.type,
                            };
                        }
                    });

                    let filter_input = document.querySelector($properties.filteringInput);

                    if (filter_input != undefined) {
                        let _filter = () => {
                            filtering.run();

                            if ($properties.pagination) {
                                pagination.setPageCount();
                                pagination.setPage(1);
                                pagination.draw();
                                pagination.drawPage();
                                pagination.drawCount();
                            } else {
                                tools.hideElements($element.querySelectorAll('tbody tr.et-filtered'));
                                tools.showElements($element.querySelectorAll('tbody tr:not(.et-filtered)'));
                            }
                        };

                        if ($properties.filteringTrigger.length) {
                            let filter_trigger = document.querySelector($properties.filteringTrigger);
                            if (filter_trigger != undefined) {
                                if (tools.isButton(filter_trigger)) {
                                    filter_trigger.addEventListener('click', (e) => _filter());
                                }
                            }
                        } else {
                            if (tools.isInputText(filter_input)) {
                                filter_input.addEventListener('input', (e) => {
                                    timer.stop(filtering.timer_name);
                                    timer.add(() => _filter(), [], (e.inputType != undefined ? 1000 : 0), filtering.timer_name);
                                });
                            }
                        }
                    }
                }
            }
        },
    };

    let $timers = [];

    let timer = {
        getIndex: (array, attr, value) => {
            for (let i = 0; i < array.length; i += 1) {
                if (array[i][attr] === value) {
                    return i;
                }
            }
            return -1;
        },
        add: (callback, args = null, time = 0, name = null) => {
            let id = setTimeout(() => {
                let index = (name != null) ? timer.getIndex($timers, 'name', name) : timer.getIndex($timers, 'id', id);
                $timers.splice(index, 1);
                if (!Array.isArray(args)) args = [];
                callback.apply(this, args);
            }, time);

            $timers.push({
                id: id,
                name: name,
                time: time
            });
        },
        all: () => $timers,
        stop: (x) => {
            let index = !isNaN(x) ? timer.getIndex($timers, 'id', x) : timer.getIndex($timers, 'name', x);

            if (index !== -1) {
                clearTimeout($timers[index].id);
                $timers.splice(index, 1);
            }
        },
        stopAll: () => {
            for (let i = 0; i < $timers.length; i++) {
                clearTimeout($timers[i].id);
            }

            $timers = [];
        }
    };

    /********* AJAX *********/

    let ajax = {
        loadPage: (page, reset_sort) => {
            tools.loadingOverlay('start', tools.isTable($element) ? $element.querySelector('tbody').clientHeight + 'px' : null);

            let data = typeof $properties.ajax.data == 'function' ? $properties.ajax.data() : $properties.ajax.data;

            if ($properties.pagination) {
                if (data instanceof FormData) {
                    data.set('page', !isNaN(page) ? page : pagination.getPage());
                    data.set('limit', pagination.getPageSize());
                } else if (typeof data == 'object') {
                    data['page'] = !isNaN(page) ? page : pagination.getPage();
                    data['limit'] = pagination.getPageSize();
                }
            }

            if (reset_sort) {
                ajax.sorting.set(undefined, false);
                sorting.reset();
            }

            if ($properties.sorting && ajax.sorting.getColumn() != undefined && ajax.sorting.getColumn().length) {
                if (data instanceof FormData) {
                    data.set('column', ajax.sorting.getColumn());
                    data.set('direction', ajax.sorting.getDirection());
                } else {
                    data['column'] = ajax.sorting.getColumn();
                    data['direction'] = ajax.sorting.getDirection();
                }
            }

            const xhttp = new XMLHttpRequest();

            xhttp.onload = function() {
                let response = JSON.parse(this.responseText);

                if (this.status == 200) {
                    if (response.success) {
                        ajax.pagination.drawPage(response.data.hasOwnProperty('data') ? response.data.data : response.data);
                        ajax.pagination.draw(response.data.hasOwnProperty('data') ? response.data : null);
                        ajax.pagination.drawCount(response.data.hasOwnProperty('data') ? response.data : null);
                    } else {
                        // tools.showEmpty();
                    }

                    if (typeof $properties.ajax.handlers.success == 'function') {
                        $properties.ajax.handlers.success(response);
                    }
                } else {
                    tools.showEmpty();
                    if (typeof $properties.ajax.handlers.error == 'function') {
                        $properties.ajax.handlers.error(this, response.message, this.statusText);
                    } else {
                        alert(this.statusText);
                    }
                }
            };

            xhttp.open($properties.ajax.type, $properties.ajax.url);

            if ($properties.ajax.type == 'POST') {
                xhttp.setRequestHeader('X-CSRF-TOKEN', document.querySelector('meta[name="csrf-token"]').getAttribute('content'));
                xhttp.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

                xhttp.send(data instanceof FormData ? data : JSON.stringify(data));
            } else {
                xhttp.send();
            }
        },
        pagination: {
            draw: (data) => {
                pagination.setPage(data != null ? data.current_page : 1);
                pagination.setPageCount(data != null ? data.last_page : 1);
                pagination.draw();
            },
            drawPage: (data) => {
                if (tools.isTable($element)) {
                    if (data.length) {
                        $element.querySelector('tbody').replaceChildren();

                        for (const key in data) {
                            let tr = document.createElement('tr');
                            let tds = '';

                            for (let i = 0; i < $properties.ajax.columns.length; i++) {
                                tds += `<td>${data[key][$properties.ajax.columns[i]]}</td>`;
                            }

                            tr.innerHTML = tds;

                            $element.querySelector('tbody').appendChild(tr);
                        }
                    } else {
                        tools.showEmpty();
                    }
                }
            },
            drawCount: (data) => {
                if (data == null) {
                    tools.pagination.drawCount(1, false, false);
                } else {
                    tools.pagination.drawCount(data.from, data.to, data.total);
                }
            },
        },
        sorting: {
            getColumn: () => $properties.ajax.sorting.column,
            getDirection: () => $properties.ajax.sorting.desc ? 'DESC' : 'ASC',
            set: (column, desc = false) => {
                $properties.ajax.sorting.column = column;
                $properties.ajax.sorting.desc = desc;
            },
        }
    };

    /********* INIT *********/

    /**
     * initialize EasyTable
     *
     * @param {String} selector
     * @param {Object} options
     */
    let init = (selector, options) => {
        if ($_init) {
            $element = document.querySelector(selector);

            if ($element == undefined) throw new Error('No element found for EasyTable');
            if (!tools.isTable($element)) throw new Error('EasyTable currently only handles tables');

            if (tools.isAjax()) {
                if (!ajax.hasOwnProperty('columns')) throw new Error('"columns" must be defined in AJAX mode');
            }

            if (typeof options == 'object') {
                $properties = tools.mergeProperties($properties, options);
            }

            pagination.init();
            sorting.init();
            filtering.init();

            if (tools.isAjax() && !$element.querySelectorAll('tbody > tr').length) {
                tools.showEmpty();
            }

            if ($properties.stickyHeader) {
                $element.querySelectorAll('thead th').forEach(function(el) {
                    el.style.position = 'sticky';

                    if (typeof $properties.stickyHeaderTop == 'function') {
                        window.addEventListener('load', (event) => $properties.stickyHeaderTop(el), true);
                        window.addEventListener('resize', (event) => $properties.stickyHeaderTop(el), true);
                    } else {
                        el.style.top = $properties.stickyHeaderTop;
                    }
                });
            }

            $_init = false;
        }
    };

    return EasyTable;
})();

// Add CommonJS module exports, so it can be imported using require() in Node.js
// https://nodejs.org/docs/latest/api/modules.html
if (typeof module !== 'undefined') {
    module.exports = EasyTable;
}
