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
function EasyTable(selector, options = []) {
    const HTTP_SUCCESS = 200;

    let _this = this;

    /**
     * events
     */
    _this.events = {
        pageNext: 'et.page_next',
        pageSelect: 'et.page_select',
    };

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
    _this.properties = {
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
        emptyText: 'No Records Found',
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
     * get the current page
     * 
     * @returns {Number}
     */
    EasyTable.getCurrentPage = () => _this.pagination.getPage();

    /**
     * set the current page
     * 
     * @param {Number} page
     */
    EasyTable.setCurrentPage = (page = 1) => {
        if (_this.properties.pagination) _this.pagination.setPage(page);
    };

    /**
     * get properties
     * 
     * @returns {Object}
     */
    EasyTable.getProperties = () => _this.properties;

    /**
     * load a page
     * 
     * @param {Number}  page
     * @param {Boolean} reset_sort
     */
    EasyTable.loadPage = (page = null, reset_sort = false) => _this.ajax.loadPage(page, reset_sort);

    /**
     * refresh EasyTable
     */
    EasyTable.refresh = () => {
        if (Math.ceil(_this.pagination.getRowsLength() / _this.pagination.getPageSize()) < _this.pagination.getPage()) {
            _this.pagination.setPage(Math.floor(_this.pagination.getRowsLength() / _this.pagination.getPageSize()))
        }

        _this.pagination.setPageCount();
        _this.pagination.drawPage();
        _this.pagination.draw();
        _this.pagination.drawCount();
    };

    /**
     * trigger certain events on this EasyTable
     * 
     * @param {String} event 
     */
    EasyTable.trigger = (event) => {
        switch (event) {
            case 'filter':
                _this.filtering.run();
                break;
            default:
                //
                break;
        }
    };

    _this.tools = {
        buildIcon: (icon) => {
            if (typeof icon == 'function') {
                return icon();
            } else if (typeof icon == 'string') {
                if (_this.tools.isValidHTML(icon) || icon.startsWith('&')) {
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
                _this.tools.hideElement(elements[i]);
            }
        },
        elementIs: (element, node_name) => element.nodeName == node_name,
        isAjax: () => _this.properties.dataType == 'ajax',
        isButton: (element) => _this.tools.elementIs(element, 'BUTTON'),
        isEmpty: () => {
            let empty = false;

            if (_this.tools.isAjax() && _this.tools.isTable(_this.element)) {
                empty = _this.element.querySelector('tbody > tr > td:first-child').innerText == _this.properties.ajax.emptyText;
            }

            return empty;
        },
        isInputText: (element) => _this.tools.elementIs(element, 'INPUT') && element.type.toUpperCase() == 'TEXT',
        isSelect: (element) => _this.tools.elementIs(element, 'SELECT'),
        isTable: (element) => _this.tools.elementIs(element, 'TABLE'),
        isValidHTML: (str) => /<(?=.*? .*?\/ ?>|br|hr|input|!--|wbr)[a-z]+.*?>|<([a-z]+).*?<\/\1>/i.test(str),
        loadingOverlay: (status, container_height = '350px', color = 'gray') => {
            const $class = 'loading-overlay';
            const $container_id = '_et_spinner_container';

            if (status == 'start') {
                let div = _this.element.querySelector(`.${$class}`);
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
                                '</svg>',
                            '</div>',
                        '</div>'
                    ].join('');

                    if (_this.tools.isTable(_this.element)) {
                        let td = document.createElement('td');
                        td.setAttribute('colspan', 100);
                        td.appendChild(div);
                        td.style.padding = 'unset';

                        let tr = document.createElement('tr');
                        tr.appendChild(td);

                        _this.element.querySelector('tbody').replaceChildren(tr);

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
                let div = _this.element.querySelector(`.${$class}`);
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

                        break;
                    case 'pageActive':
                        let value = parseInt(options[o]);
                        if (!isNaN(value)) properties[o] = value;

                        break;
                    case 'pageSize':
                        properties[o] = parseInt(options[o]);

                        break;
                    default:
                        properties[o] = options[o];
                        break;
                }
            }

            const style = window.getComputedStyle(_this.element.querySelector('thead th:first-child'));

            for (const dir in properties.sortingIcons) {
                if (typeof properties.sortingIcons[dir] == 'string' && !properties.sortingIcons[dir].length) {
                    properties.sortingIcons[dir] = _this.tools.sorting.defaultIcon(
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
                let count_text = _this.properties.countText;
                count_text = count_text.replace('{CP}', _this.properties.pageActive);
                count_text = count_text.replace('{TP}', _this.pagination.page_count);
                count_text = count_text.replace('{PF}', page_start);
                count_text = count_text.replace('{PL}', page_end);
                count_text = count_text.replace('{TR}', total);

                if (!page_end) {
                    _this.tools.hideElement(_this.element.querySelector(_this.properties.countTextContainer));
                } else {
                    _this.element.querySelector(_this.properties.countTextContainer).innerText = count_text;
                    _this.tools.showElement(_this.element.querySelector(_this.properties.countTextContainer));
                }
            },
            onClick: (event) => {
                event.preventDefault();

                if (!event.target.closest('li.page-item').classList.contains('active')) {
                    if (isNaN(event.target.dataset.page)) {
                        _this.pagination.setPage((event.target.dataset.page == 'next') ? _this.properties.pageActive + 1 : _this.properties.pageActive - 1);
                    } else {
                        _this.pagination.setPage(event.target.dataset.page);
                    }

                    _this.pagination.drawPage();

                    if (_this.properties.paginationSideLinks > 0) {
                        _this.pagination.draw();
                    } else {
                        document.querySelector(_this.properties.paginationContainer).querySelectorAll('li.page-item.active').forEach(e => e.classList.remove('active'));
                        document.querySelector(`a.page-link[data-page="${_this.properties.pageActive}"]`).closest('li.page-item').classList.add('active');
                        event.target.dispatchEvent(new Event(_this.events.pageSelect));
                    }

                    _this.pagination.drawCount();
                }
            },
            onClickAjax: (event) => {
                event.preventDefault();

                if (!event.target.closest('li.page-item').classList.contains('active')) {
                    let page = event.target.dataset.page;
                    if (isNaN(event.target.dataset.page)) {
                        page = event.target.dataset.page == 'next' ? _this.properties.pageActive + 1 : _this.properties.pageActive - 1;
                    }

                    _this.ajax.loadPage(page);
                }
            },
        },
        removeEmpty: () => {
            if (_this.tools.isTable(_this.element)) {
                let empty_row = _this.element.querySelector('tbody tr.et-empty-row');
                if (empty_row != null) {
                    empty_row.remove();
                }

                if (_this.element.querySelector('tfoot') != null) {
                    _this.tools.showElement(_this.element.querySelector('tfoot'));
                }
            }
        },
        showElement: (element) => element.style.display = null,
        showElements: (elements) => {
            for (let i = 0; i < elements.length; i++) {
                _this.tools.showElement(elements[i]);
            }
        },
        showEmpty: () => {
            if (_this.tools.isTable(_this.element)) {
                let tr = document.createElement('tr');
                tr.classList.add('et-empty-row');
                tr.innerHTML = `<td style="text-align: center;" colspan="18">${_this.tools.isAjax() ? _this.properties.ajax.emptyText : _this.properties.emptyText}</td>`;

                _this.element.querySelector('tbody').appendChild(tr);

                if (_this.element.querySelector('tfoot') != null) {
                    _this.tools.hideElement(_this.element.querySelector('tfoot'));
                }
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
            getIcon: (type) => _this.tools.buildIcon(_this.properties.sortingIcons[['asc', 'desc', 'none'].includes(type) ? type : 'none']),
            onClick: (event, element) => {
                let th = _this.tools.elementIs(event.target, 'TH') ? event.target : event.target.closest('th.et-sortable');
                let descending = th.dataset.ascending == 0;

                _this.tools.sorting.updateIcons(event, !descending);

                Array.prototype.slice.call(_this.pagination.getRows()).sort(
                    _this.sorting.comparer(Array.prototype.indexOf.call(_this.element.querySelectorAll('thead > tr > th'), element), !descending)
                ).forEach(function(tr) {
                    _this.element.querySelector('tbody').appendChild(tr);
                });

                _this.pagination.drawPage();

                th.dataset.ascending = (!descending ? 0 : 1);
            },
            onClickAjax: (event) => {
                if (!_this.tools.isEmpty()) {
                    let th = _this.tools.elementIs(event.target, 'TH') ? event.target : event.target.closest('th.et-sortable');
                    let descending = th.dataset.ascending == 0;

                    _this.tools.sorting.updateIcons(event, !descending);

                    _this.ajax.sorting.set(th.dataset.column, descending);
                    _this.ajax.loadPage(1);

                    th.dataset.ascending = (!descending ? 0 : 1);
                }
            },
            updateIcons: (event, ascending) => {
                let th = _this.tools.elementIs(event.target, 'TH') ? event.target : event.target.closest('th.et-sortable');

                _this.element.querySelectorAll('thead > tr > th.et-sortable').forEach(e => {
                    e.querySelector('span.et-table-sort').innerHTML = _this.tools.sorting.getIcon('none');
                });

                th.querySelector('span.et-table-sort').innerHTML = _this.tools.sorting.getIcon(ascending ? 'asc' : 'desc');
            },
        },
    };

    /******** PAGINATION ********/

    _this.pagination = {
        page_count: 1,
        getRows: () => _this.tools.isTable(_this.element) ? _this.element.querySelectorAll(`tbody tr:not(.et-filtered)`) : [],
        getRowsLength: () => _this.pagination.getRows().length,
        getPage: () => _this.properties.pageActive,
        getPageSize: () => _this.properties.pageSize,
        getPageStart: () => (!_this.properties.pagination || isNaN(_this.pagination.getPageSize())) ? 1 : ((_this.properties.pageActive - 1) * _this.pagination.getPageSize()) + 1,
        getPageEnd: () => (!_this.properties.pagination || isNaN(_this.pagination.getPageSize())) ? _this.pagination.getRowsLength() : (_this.pagination.getPageStart() + _this.pagination.getPageSize()) - 1,
        setPage: (page = null) => {
            _this.properties.pageActive = Math.max(1, Math.min(_this.pagination.page_count, (isNaN(page) || page < 1) ? 1 : Math.max(page, 1)));
        },
        setPageCount: (page_count = null) => {
            if (_this.tools.isAjax()) {
                _this.pagination.page_count = !isNaN(page_count) ? page_count : 1;
            } else {
                _this.pagination.page_count = isNaN(_this.pagination.getPageSize()) ? 1 : Math.ceil(_this.pagination.getRowsLength() / _this.pagination.getPageSize());
            }
        },
        draw: () => {
            if (_this.pagination.page_count > 1) {
                let inner_html = [
                    '<ul id="et-pagination" class="pagination">',
                    '<li class="page-item">',
                        '<a class="page-link" href="#" aria-label="Previous" data-page="prev">',
                            `<span aria-hidden="true">${_this.tools.buildIcon(_this.properties.paginationPrevious.arrow)}</span>`,
                        '</a>',
                    '</li>',
                ];

                if (_this.properties.pageActive > _this.pagination.page_count) _this.pagination.setPage(_this.pagination.page_count);

                if (!isNaN(_this.properties.paginationSideLinks) && _this.properties.paginationSideLinks > 0 && _this.pagination.page_count > (_this.properties.paginationSideLinks + 3)) {
                    let side_links = {
                        start: _this.properties.pageActive - _this.properties.paginationSideLinks,
                        end: _this.properties.pageActive + _this.properties.paginationSideLinks,
                    };

                    if (side_links.start <= 0) {
                        side_links.end += (Math.abs(side_links.start) + 1)
                        side_links.start = 1;
                    } else if (side_links.end > _this.pagination.page_count - 1) {
                        side_links.start -= (side_links.end - _this.pagination.page_count);
                        side_links.end = _this.pagination.page_count;
                    }

                    for (let i = 1; i <= _this.pagination.page_count; i++) {
                        if (i == 1 || i == _this.pagination.page_count || (i >= side_links.start && i <= side_links.end)) {
                            inner_html.push(
                                `<li class="page-item ${(i == _this.properties.pageActive ? 'active' : '')}">`,
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
                                    i = Math.max(1, _this.pagination.page_count - 1);
                                }
                            }
                        }
                    }
                } else {
                    for (let i = 1; i <= _this.pagination.page_count; i++) {
                        inner_html.push(
                            `<li class="page-item ${(i == _this.properties.pageActive ? 'active' : '')}">`,
                                `<a class="page-link" href="#" data-page="${i}">${i}</a>`,
                            '</li>'
                        );
                    }
                }

                inner_html.push(
                    '<li class="page-item">',
                        '<a class="page-link" href="#" aria-label="Next" data-page="next">',
                            `<span aria-hidden="true">${_this.tools.buildIcon(_this.properties.paginationNext.arrow)}</span>`,
                        '</a>',
                    '</li>',
                    '</ul>'
                );

                _this.element.querySelector(_this.properties.paginationContainer).innerHTML = inner_html.join('');

                if (_this.tools.isAjax()) {
                    _this.element.querySelectorAll('a.page-link').forEach(element => {
                        element.addEventListener('click', (event) => {
                            _this.tools.pagination.onClickAjax(event)
                        });
                    });
                } else {
                    _this.element.querySelectorAll('a.page-link').forEach(element => {
                        element.addEventListener('click', (event) => {
                            _this.tools.pagination.onClick(event)
                        });
                    });
                }
            } else {
                document.querySelector(_this.properties.paginationContainer).innerHTML = '';
            }
        },
        drawCount: () => {
            _this.tools.pagination.drawCount(
                _this.pagination.getPageStart(),
                Math.min(_this.pagination.getPageEnd(), _this.pagination.getRowsLength()),
                _this.pagination.getRowsLength()
            );
        },
        drawPage: (init = false) => {
            if (_this.tools.isTable(_this.element) && !_this.tools.isAjax()) {
                if (!init) {
                    _this.tools.hideElements(_this.element.querySelectorAll('tbody tr'));
                    _this.tools.showElements(Array.from(_this.element.querySelectorAll('tbody tr:not(.et-filtered')).slice(_this.pagination.getPageStart() - 1, _this.pagination.getPageEnd()));
                } else {
                    _this.tools.hideElements(Array.from(_this.element.querySelectorAll('tbody tr:not(.et-filtered')).slice(_this.pagination.getPageEnd()));
                }
            }
        },
        init: () => {
            if (_this.properties.pagination) {
                _this.pagination.setPageCount();
                _this.pagination.drawPage(true);
                _this.pagination.draw();
                _this.pagination.drawCount();

                if (_this.properties.pageSizeSelector.length) {
                    let page_size_selector = document.querySelector(_this.properties.pageSizeSelector);
                    if (_this.tools.isSelect(page_size_selector)) {
                        page_size_selector.addEventListener('change', (event) => {
                            let page_size = parseInt(event.target.value);

                            if (_this.tools.isAjax()) {
                                _this.properties = _this.tools.mergeProperties(_this.properties, {
                                    pageSize: isNaN(page_size) ? '' : page_size
                                });

                                if (!_this.tools.isEmpty()) _this.ajax.loadPage(1);
                            } else {
                                _this.properties = _this.tools.mergeProperties(_this.properties, {
                                    pageSize: isNaN(page_size) ? _this.pagination.getRowsLength() : page_size
                                });

                                _this.pagination.setPage(1);
                                _this.pagination.setPageCount();
                                _this.pagination.drawPage();
                                _this.pagination.draw();
                                _this.pagination.drawCount();
                            }
                        });
                    }
                }
            }
        },
    };

    /******** SORTING ********/

    _this.sorting = {
        getCellValue: (tr, index) => {
            let value = tr.children[index].innerText || tr.children[index].textContent;
            value = value.replace(/\s+/g, ' ').trim();
            
            if (!value.length) {
                let input = tr.querySelector('input[type=text]');
                if (input != null) value = input.value.replace(/\s+/g, ' ').trim();
            }

            return value;
        },
        comparer: (index, asc) => {
            return (a, b) => {
                return function(v1, v2) {
                    return v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2);
                }(_this.sorting.getCellValue(asc ? a : b, index), _this.sorting.getCellValue(asc ? b : a, index));
            }
        },
        init: () => {
            if (_this.properties.sorting) {
                if (_this.tools.isTable(_this.element)) {
                    _this.element.querySelectorAll('thead > tr > th.et-sortable').forEach(element => {
                        element.style.cursor = 'pointer';
                        element.innerHTML = element.innerHTML + `<span class="et-table-sort" style="margin-left: 5px;">${_this.tools.sorting.getIcon('none')}</span>`;

                        if (_this.tools.isAjax()) {
                            element.addEventListener('click', (event) => {
                                _this.tools.sorting.onClickAjax(event);
                            });
                        } else {
                            element.addEventListener('click', (event) => {
                                _this.tools.sorting.onClick(event, element);
                            });
                        }
                    });
                }
            }
        },
        reset: () => {
            _this.element.querySelectorAll('thead > tr > th.et-sortable').forEach(e => {
                e.querySelector('span.et-table-sort').innerHTML = _this.tools.sorting.getIcon();
                e.dataset.ascending = '1';
            });
        },
    };

    /******** FILTERING ********/

    _this.filtering = {
        columns: [],
        timer_name: 'et-run-filter',
        run: () => {
            let value = document.querySelector(_this.properties.filteringInput).value.trim();

            if (_this.tools.isTable(_this.element)) {
                if (value.length) {
                    _this.element.querySelectorAll('tbody tr').forEach(element => {
                        let result = false;
                        let loop_stop = false;

                        element.querySelectorAll('td').forEach((e, i) => {
                            if (loop_stop) return;

                            if (Object.keys(_this.filtering.columns).includes(i.toString())) {
                                let text = e.innerText.toString().trim().toLowerCase();
                                if (!text.length) {
                                    let input = e.querySelector('input[type=text]');
                                    if (input != null) text = input.value.toString().trim().toLowerCase();
                                }

                                if (_this.filtering.columns[i.toString()].hasOwnProperty('type')) {
                                    switch (_this.filtering.columns[i.toString()].type) {
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
                    _this.element.querySelectorAll('tbody tr').forEach(e => e.classList.remove('et-filtered'));
                }

                if (_this.element.querySelectorAll('tbody tr:not(.et-filtered)').length) {
                    _this.tools.removeEmpty();
                } else {
                    _this.tools.showEmpty();
                }
            }
        },
        init: () => {
            if (_this.properties.filtering) {
                if (_this.tools.isTable(_this.element)) {
                    _this.filtering.columns = [];
                    _this.element.querySelectorAll('thead th').forEach((element, index) => {
                        if (element.classList.contains('et-filter')) {
                            _this.filtering.columns[index] = {
                                type: element.dataset.type,
                            };
                        }
                    });

                    let filter_input = document.querySelector(_this.properties.filteringInput);

                    if (filter_input != undefined) {
                        let _filter = () => {
                            _this.filtering.run();

                            if (_this.properties.pagination) {
                                _this.pagination.setPageCount();
                                _this.pagination.setPage(1);
                                _this.pagination.draw();
                                _this.pagination.drawPage();
                                _this.pagination.drawCount();
                            } else {
                                _this.tools.hideElements(_this.element.querySelectorAll('tbody tr.et-filtered'));
                                _this.tools.showElements(_this.element.querySelectorAll('tbody tr:not(.et-filtered)'));
                            }
                        };

                        if (_this.properties.filteringTrigger.length) {
                            let filter_trigger = document.querySelector(_this.properties.filteringTrigger);
                            if (filter_trigger != undefined) {
                                if (_this.tools.isButton(filter_trigger)) {
                                    filter_trigger.addEventListener('click', (e) => _filter());
                                }
                            }
                        } else {
                            if (_this.tools.isInputText(filter_input)) {
                                filter_input.addEventListener('input', (e) => {
                                    _this.timer.stop(_this.filtering.timer_name);
                                    _this.timer.add(() => _filter(), [], (e.inputType != undefined ? 1000 : 0), _this.filtering.timer_name);
                                });
                            }
                        }
                    }
                }
            }
        },
    };

    _this.timers = [];

    _this.timer = {
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
                let index = (name != null) ? _this.timer.getIndex(_this.timers, 'name', name) : _this.timer.getIndex(_this.timers, 'id', id);
                _this.timers.splice(index, 1);
                if (!Array.isArray(args)) args = [];
                callback.apply(this, args);
            }, time);

            _this.timers.push({
                id: id,
                name: name,
                time: time
            });
        },
        all: () => _this.timers,
        stop: (x) => {
            let index = !isNaN(x) ? _this.timer.getIndex(_this.timers, 'id', x) : _this.timer.getIndex(_this.timers, 'name', x);

            if (index !== -1) {
                clearTimeout(_this.timers[index].id);
                _this.timers.splice(index, 1);
            }
        },
        stopAll: () => {
            for (let i = 0; i < _this.timers.length; i++) {
                clearTimeout(_this.timers[i].id);
            }

            _this.timers = [];
        }
    };

    /********* AJAX *********/

    _this.ajax = {
        loadPage: (page, reset_sort) => {
            _this.tools.loadingOverlay('start', _this.tools.isTable(_this.element) ? _this.element.querySelector('tbody').clientHeight + 'px' : null);
            _this.tools.removeEmpty();

            let data = typeof _this.properties.ajax.data == 'function' ? _this.properties.ajax.data() : _this.properties.ajax.data;

            if (_this.properties.pagination) {
                if (data instanceof FormData) {
                    data.set('page', !isNaN(page) ? page : _this.pagination.getPage());
                    data.set('limit', _this.pagination.getPageSize());
                } else if (typeof data == 'object') {
                    data['page'] = !isNaN(page) ? page : _this.pagination.getPage();
                    data['limit'] = _this.pagination.getPageSize();
                }
            }

            if (reset_sort) {
                _this.ajax.sorting.set(undefined, false);
                _this.sorting.reset();
            }

            if (_this.properties.sorting && _this.ajax.sorting.getColumn() != undefined && _this.ajax.sorting.getColumn().length) {
                if (data instanceof FormData) {
                    data.set('column', _this.ajax.sorting.getColumn());
                    data.set('direction', _this.ajax.sorting.getDirection());
                } else {
                    data['column'] = _this.ajax.sorting.getColumn();
                    data['direction'] = _this.ajax.sorting.getDirection();
                }
            }

            const xhttp = new XMLHttpRequest();

            xhttp.onload = function() {
                let response = JSON.parse(this.responseText);

                if (this.status == HTTP_SUCCESS) {
                    if (response.success) {
                        _this.tools.loadingOverlay('stop');
                        _this.ajax.pagination.drawPage(response.data.hasOwnProperty('data') ? response.data.data : response.data);
                        _this.ajax.pagination.draw(response.data.hasOwnProperty('data') ? response.data : null);
                        _this.ajax.pagination.drawCount(response.data.hasOwnProperty('data') ? response.data : null);
                    } else {
                        // _this.tools.showEmpty();
                    }

                    if (typeof _this.properties.ajax.handlers.success == 'function') {
                        _this.properties.ajax.handlers.success(response);
                    }
                } else {
                    _this.tools.loadingOverlay('stop');
                    _this.tools.showEmpty();
                    if (typeof _this.properties.ajax.handlers.error == 'function') {
                        _this.properties.ajax.handlers.error(this, response.message, this.statusText);
                    } else {
                        alert(this.statusText);
                    }
                }
            };

            xhttp.open(_this.properties.ajax.type, _this.properties.ajax.url);

            if (_this.properties.ajax.type == 'POST') {
                xhttp.setRequestHeader('X-CSRF-TOKEN', document.querySelector('meta[name="csrf-token"]').getAttribute('content'));
                xhttp.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

                xhttp.send(data instanceof FormData ? data : JSON.stringify(data));
            } else {
                xhttp.send();
            }
        },
        pagination: {
            draw: (data) => {
                _this.pagination.setPage(data != null ? data.current_page : 1);
                _this.pagination.setPageCount(data != null ? data.last_page : 1);
                _this.pagination.draw();
            },
            drawPage: (data) => {
                if (_this.tools.isTable(_this.element)) {
                    if (data.length) {
                        _this.element.querySelector('tbody').replaceChildren();

                        for (const key in data) {
                            let tr = document.createElement('tr');
                            let tds = '';

                            for (let i = 0; i < _this.properties.ajax.columns.length; i++) {
                                tds += `<td>${data[key][_this.properties.ajax.columns[i]]}</td>`;
                            }

                            tr.innerHTML = tds;

                            _this.element.querySelector('tbody').appendChild(tr);
                        }

                        _this.tools.removeEmpty()
                    } else {
                        _this.tools.showEmpty();
                    }
                }
            },
            drawCount: (data) => {
                if (data == null) {
                    _this.tools.pagination.drawCount(1, false, false);
                } else {
                    _this.tools.pagination.drawCount(data.from, data.to, data.total);
                }
            },
        },
        sorting: {
            getColumn: () => _this.properties.ajax.sorting.column,
            getDirection: () => _this.properties.ajax.sorting.desc ? 'DESC' : 'ASC',
            set: (column, desc = false) => {
                _this.properties.ajax.sorting.column = column;
                _this.properties.ajax.sorting.desc = desc;
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
    function init(selector, options) {
        _this.element = document.querySelector(selector);

        if (_this.element == undefined) throw new Error('No element found for EasyTable');
        if (!_this.tools.isTable(_this.element)) throw new Error('EasyTable currently only handles tables');

        if (_this.tools.isAjax()) {
            if (!_this.ajax.hasOwnProperty('columns')) throw new Error('"columns" must be defined in AJAX mode');
        }

        if (typeof options == 'object') {
            _this.properties = _this.tools.mergeProperties(_this.properties, options);
        }

        _this.pagination.init();
        _this.sorting.init();
        _this.filtering.init();

        if (!_this.element.querySelectorAll('tbody > tr').length) {
            _this.tools.showEmpty();
        }

        if (_this.properties.stickyHeader) {
            _this.element.querySelectorAll('thead th').forEach(function(el) {
                el.style.position = 'sticky';

                if (typeof _this.properties.stickyHeaderTop == 'function') {
                    window.addEventListener('load', (event) => _this.properties.stickyHeaderTop(el), true);
                    window.addEventListener('resize', (event) => _this.properties.stickyHeaderTop(el), true);
                } else {
                    el.style.top = _this.properties.stickyHeaderTop;
                }
            });
        }
    }

    init(selector, options);

    return EasyTable;
};

// Add CommonJS module exports, so it can be imported using require() in Node.js
// https://nodejs.org/docs/latest/api/modules.html
if (typeof module !== 'undefined') {
    module.exports = EasyTable;
}
