import type { Component } from 'solid-js';
import {
    createSignal,
    createEffect,
    For,
    Show,
    Index,
    onMount,
} from 'solid-js';

import logo from './logo.svg';
import styles from './App.module.css';

const Sortable = (props) => {
    const sortable = createSortable(props.item);
    return (
        <div
            use:sortable
            class={styles.sortable}
            classList={{ opacity_25: sortable.isActiveDraggable }}
        >
            {props.item}
        </div>
    );
};

const App: Component = () => {

    const [entries, setEntries] = createSignal([
        {
            category: 'Productivity',
            apps: [
                { name: 'NextCloud', url: 'https://nextcloud.com' },
                { name: 'Bitwarden', url: 'https://bitwarden.com' },
                { name: 'Todoist', url: 'https://todoist.com' },
                { name: 'Lounge', url: 'https://lounge.com' },
            ],
            order: 0,
        },
        {
            category: 'Linux',
            apps: [
                { name: 'Arch Linux', url: 'https://archlinux.org' },
                { name: 'Ubuntu', url: 'https://ubuntu.com' },
                { name: 'Debian', url: 'https://debian.com' },
                { name: 'Kali Linux', url: 'https://kalilinux.org' },
                { name: 'RedHat', url: 'https://redhat.com' },
                { name: 'Fedora', url: 'https://fedora.com' },
            ],
            order: 1,
        },
        {
            category: 'Development',
            apps: [
                { name: 'GitHub', url: 'https://github.com' },
                { name: 'GitLab', url: 'https://gitlab.com' },
                { name: 'Jupyter Notebook', url: 'https://jupyter.org' },
                { name: 'Snibox', url: 'https://snibox.com' },
            ],
            order: 5,
        },
        {
            category: 'Design',
            apps: [
                { name: 'Dribbbble', url: 'https://dribbble.com' },
                { name: 'Behance', url: 'https://ubuntu.com' },
                { name: 'Pinterest', url: 'https://debian.com' },
                { name: 'Adobe Illustrator', url: 'https://kalilinux.org' },
                { name: 'Adobe Photoshop', url: 'https://redhat.com' },
                { name: 'Fedora', url: 'https://fedora.com' },
            ],
            order: 6,
        },
        {
            category: 'Media',
            apps: [
                { name: 'PLEX', url: 'https://plex.tv' },
                { name: 'FreshRSS', url: 'https://freshrss.org' },
                { name: 'Feedly', url: 'https://feedly.com' },
                { name: 'Photoview', url: 'https://photoview.com' },
            ],
            order: 2,
        },
        {
            category: 'Networking',
            apps: [
                { name: 'NetData', url: 'https://netdata.cloud' },
                { name: 'Docker', url: 'https://docker.com' },
                { name: 'PiHole', url: 'https://PiHole.net' },
                { name: 'Photoview', url: 'https://photoview.com' },
            ],
            order: 3,
        },
        {
            category: 'Life Style',
            apps: [
                { name: 'Coffee', url: 'https://netdata.cloud' },
                { name: 'Tea', url: 'https://docker.com' },
                { name: 'Cocktail', url: 'https://PiHole.net' },
                { name: 'Yelp', url: 'https://photoview.com' },
            ],
            order: 4,
        },
    ]);

    onMount(async () => {
        const cards = document
            .getElementsByClassName('dashboard')[0]
            .getElementsByClassName('card');
    });

    const [items, setItems] = createSignal([1, 2, 3, 4, 5, 6, 7, 8]);
    const [activeItem, setActiveItem] = createSignal(null);
    const ids = () => items();

    const onDragStart = ({ draggable }) => setActiveItem(draggable.id);

    const onDragEnd = ({ draggable, droppable }) => {
        if (draggable && droppable) {
            const currentItems = ids();
            const fromIndex = currentItems.indexOf(draggable.id);
            const toIndex = currentItems.indexOf(droppable.id);
            if (fromIndex !== toIndex) {
                const updatedItems = currentItems.slice();
                updatedItems.splice(
                    toIndex,
                    0,
                    ...updatedItems.splice(fromIndex, 1)
                );
                setItems(updatedItems);
            }
        }
        setActiveItem(null);
    };

    return (
        <div class={styles.App}>
            <header class={styles.header}>
                <div class={styles.logo}>OPAQUE</div>
            </header>
            <main class={styles.main}>
                <div class={styles.sidebar}>
                    <input type="text" placeholder="" class={styles.search} />
                    <div class={styles.weather}>
                        {/* <div class={styles.weather_item}>
                            <div>
                                Chicago / Partly cloudy / 77°F / 48% / ↙15mph
                            </div>
                        </div>
                        <div class={styles.weather_item}>
                            <div>
                                18:49:58 / SUNRISE 05:53:46 / SUNSET 19:57:13
                            </div>
                        </div> */}
                        <div class={styles.weather_item}>
                            <div>Chicago</div>
                            <div>Partly cloudy</div>
                        </div>
                        <div class={styles.weather_item}>
                            <div>Temperature</div>
                            <div>77°F</div>
                        </div>
                        <div class={styles.weather_item}>
                            <div>Humidity</div>
                            <div>48%</div>
                        </div>
                        <div class={styles.weather_item}>
                            <div>Wind</div>
                            <div>↙15mph</div>
                        </div>
                        <div class={styles.weather_item}>
                            <div>Now</div>
                            <div>18:49:58</div>
                        </div>
                        <div class={styles.weather_item}>
                            <div>Sunrise</div>
                            <div>05:53:46</div>
                        </div>
                        <div class={styles.weather_item}>
                            <div>Sunset</div>
                            <div>19:57:13</div>
                        </div>
                    </div>
                    <div class={styles.performance}>
                        <div class={styles.perf_item}>
                            <div>CPU / 33% / 30 °C</div>
                        </div>
                        <div class={styles.perf_item}>
                            <div>MEM / 30% / 11.8 GB</div>
                        </div>
                    </div>
                </div>
                <div class={`${styles.dashboard} dashboard`}>
                    {/* <div class={styles.card}>
                    <div class={styles.card_title}>Home</div>
                    <div class={styles.card_content}>
                        <div class={styles.card_item}>Home Assistant</div>
                        <div class={styles.card_item}>Grafana</div>
                        <div class={styles.card_item}>Prometheus</div>
                    </div>
                </div> */}

                    <Index each={entries()}>
                        {(entry, j) => (
                            <div class={`${styles.card} card`}>
                                <div class={styles.card_title}>
                                    {entry().category}
                                </div>
                                <div class={styles.card_content}>
                                    <Index each={entry().apps}>
                                        {(app) => (
                                            <div class={styles.card_item}>
                                                {app().name}
                                            </div>
                                        )}
                                    </Index>
                                </div>
                            </div>
                        )}
                    </Index>
                </div>
            </main>
        </div>
    );
};

export default App;
