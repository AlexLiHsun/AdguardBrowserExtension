import React, { Fragment, Component } from 'react';
import browser from 'webextension-polyfill';
import sortBy from 'lodash/sortBy';
import Group from './Group';
import Checkbox from '../Settings/Checkbox';
import Filter from './Filter';
import EmptyCustom from './EmptyCustom';


function filterUpdate(props) {
    const { rulesCount, lastUpdateDate, updateClickHandler } = props;
    return (
        <Fragment>
            <div>
                { `"Filter rules count: " ${rulesCount}` }
            </div>
            <div>
                {lastUpdateDate}
            </div>
            <div onChange={updateClickHandler}>update button</div>
        </Fragment>
    );
}

class Filters extends Component {
    state = {
        search: '',
        filtersData: {},
        showFiltersByGroup: false,
    };

    async componentDidMount() {
        let filtersData;
        try {
            filtersData = await browser.runtime.sendMessage({ type: 'getFiltersData' });
        } catch (e) {
            console.log(e);
        }
        if (filtersData) {
            this.setState(state => ({
                ...state, ...filtersData,
            }));
        }
    }

    handleSearch = (e) => {
        console.log(e.target.value);
    };

    handleGroupSwitch = async ({ id, data }) => {
        const { groups } = this.state;

        try {
            await browser.runtime.sendMessage({ type: 'updateGroupStatus', id, value: data });
        } catch (e) {
            console.log(e);
        }

        const group = groups[id];
        this.setState(state => ({
            ...state,
            groups: {
                ...groups,
                [id]: {
                    ...group,
                    enabled: data,
                },
            },
        }));
    };

    groupClickHandler = groupId => (e) => {
        if (!e.target.closest('.checkbox')) {
            this.setState({ showFiltersByGroup: groupId });
        }
    };

    getEnabledFiltersByGroup = (group) => {
        const { filters } = this.state;
        return group.filters.map((filterId) => {
            const { enabled, name } = filters[filterId];
            return enabled && name;
        }).filter(name => !!name);
    };

    renderGroups = (groups) => {
        const sortedGroups = sortBy(Object.values(groups), 'order');
        return sortedGroups.map((group) => {
            const enabledFilters = this.getEnabledFiltersByGroup(group);
            return (
                <Group
                    key={group.id}
                    {...group}
                    enabledFilters={enabledFilters}
                    groupClickHandler={this.groupClickHandler(group.id)}
                >
                    <Checkbox
                        id={group.id}
                        value={group.enabled}
                        handler={this.handleGroupSwitch}
                    />
                </Group>
            );
        });
    };

    handleFilterSwitch = async ({ id, data }) => {
        const { filters } = this.state;

        try {
            await browser.runtime.sendMessage({ type: 'updateFilterStatus', id, value: data });
        } catch (e) {
            console.log(e);
        }

        const filter = filters[id];
        this.setState(state => ({
            ...state,
            filters: {
                ...filters,
                [id]: {
                    ...filter,
                    enabled: data,
                },
            },
        }));
    };


    renderFilters = filters => Object.values(filters).map((filter) => {
        const tags = filter.tags
            .map(tagId => this.state.tags[tagId])
            .filter(entity => entity);
        return (
            <Filter key={filter.id} filter={filter} tags={tags}>
                <Checkbox
                    id={filter.id}
                    value={filter.enabled}
                    handler={this.handleFilterSwitch}
                />
            </Filter>
        );
    });

    handleReturnToGroups = () => {
        this.setState({ showFiltersByGroup: false });
    };

    render() {
        const { groups } = this.state;
        const showFiltersByGroup = 0;
        if (groups && showFiltersByGroup !== false) {
            const { filters } = this.state;
            const group = groups[showFiltersByGroup];
            const groupFilters = group.filters.map(filterId => filters[filterId]);
            if (group.id === 0 && groupFilters.length === 0) {
                return (
                    <Fragment>
                        <div className="title-btn">
                            <button type="button" className="button button--back" onClick={this.handleReturnToGroups} />
                            <h2 className="title title--back-btn">{group.name}</h2>
                        </div>
                        <EmptyCustom />
                    </Fragment>
                );
            }
            return (
                <Fragment>
                    <div className="title-btn">
                        <button type="button" className="button button--back" onClick={this.handleReturnToGroups} />
                        <h2 className="title title--back-btn">{group.name}</h2>
                    </div>
                    <input type="text" onChange={this.handleSearch} />
                    {filters && this.renderFilters(groupFilters)}
                </Fragment>
            );
        }
        return (
            <Fragment>
                <h2 className="title">Filters</h2>
                <input type="text" onChange={this.handleSearch} />
                {groups && this.renderGroups(groups)}
            </Fragment>
        );
    }
}

export default Filters;