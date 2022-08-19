import { useState } from 'react';
import {
    closestCenter,
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';
import { Item } from './Item';
import { Card } from './Card';

import reactLogo from './assets/react.svg';
import './App.css';
import entries from './entries1.json';

function App() {
    const [count, setCount] = useState(0);
    // const [entries, setEntries] = useState([
    //     {
    //         category: 'Productivity',
    //         apps: [
    //             { name: 'NextCloud', url: 'https://nextcloud.com' },
    //             { name: 'Bitwarden', url: 'https://bitwarden.com' },
    //             { name: 'Todoist', url: 'https://todoist.com' },
    //             { name: 'Lounge', url: 'https://lounge.com' },
    //         ],
    //         order: 0,
    //     },
    //     {
    //         category: 'Linux',
    //         apps: [
    //             { name: 'Arch Linux', url: 'https://archlinux.org' },
    //             { name: 'Ubuntu', url: 'https://ubuntu.com' },
    //             { name: 'Debian', url: 'https://debian.com' },
    //             { name: 'Kali Linux', url: 'https://kalilinux.org' },
    //             { name: 'RedHat', url: 'https://redhat.com' },
    //             { name: 'Fedora', url: 'https://fedora.com' },
    //         ],
    //         order: 1,
    //     },
    //     {
    //         category: 'Development',
    //         apps: [
    //             { name: 'GitHub', url: 'https://github.com' },
    //             { name: 'GitLab', url: 'https://gitlab.com' },
    //             { name: 'Jupyter Notebook', url: 'https://jupyter.org' },
    //             { name: 'Snibox', url: 'https://snibox.com' },
    //         ],
    //         order: 5,
    //     },
    //     {
    //         category: 'Design',
    //         apps: [
    //             { name: 'Dribbbble', url: 'https://dribbble.com' },
    //             { name: 'Behance', url: 'https://ubuntu.com' },
    //             { name: 'Pinterest', url: 'https://debian.com' },
    //             { name: 'Adobe Illustrator', url: 'https://kalilinux.org' },
    //             { name: 'Adobe Photoshop', url: 'https://redhat.com' },
    //             { name: 'Fedora', url: 'https://fedora.com' },
    //         ],
    //         order: 6,
    //     },
    //     {
    //         category: 'Media',
    //         apps: [
    //             { name: 'PLEX', url: 'https://plex.tv' },
    //             { name: 'FreshRSS', url: 'https://freshrss.org' },
    //             { name: 'Feedly', url: 'https://feedly.com' },
    //             { name: 'Photoview', url: 'https://photoview.com' },
    //         ],
    //         order: 2,
    //     },
    //     {
    //         category: 'Networking',
    //         apps: [
    //             { name: 'NetData', url: 'https://netdata.cloud' },
    //             { name: 'Docker', url: 'https://docker.com' },
    //             { name: 'PiHole', url: 'https://PiHole.net' },
    //             { name: 'Photoview', url: 'https://photoview.com' },
    //         ],
    //         order: 3,
    //     },
    //     {
    //         category: 'Life Style',
    //         apps: [
    //             { name: 'Coffee', url: 'https://netdata.cloud' },
    //             { name: 'Tea', url: 'https://docker.com' },
    //             { name: 'Cocktail', url: 'https://PiHole.net' },
    //             { name: 'Yelp', url: 'https://photoview.com' },
    //         ],
    //         order: 4,
    //     },
    // ]);
    const [items, setItems] = useState(entries);
    // const [items, setItems] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const [activeId, setActiveId] = useState(null);
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragStart(event: { active: any }) {
        const { active } = event;

        setActiveId(active.id);
    }

    function handleDragEnd(event: { active: any; over: any }) {
        const { active, over } = event;

        if (active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.indexOf(active.id);
                const newIndex = items.indexOf(over.id);

                return arrayMove(items, oldIndex, newIndex);
            });
        }

        setActiveId(null);
    }
    return (
        <div className="App">
            <header className="header">
                <div className="logo">OPAQUE</div>
            </header>
            <main className="main">
                <div className="sidebar">
                    <input type="text" placeholder="" className="search" />
                    <div className="weather">
                        <div className="weather_item">
                            <div>
                                Chicago / Partly cloudy / 77°F / 48% / ↙15mph
                            </div>
                        </div>
                        <div className="weather_item">
                            <div>
                                18:49:58 / SUNRISE 05:53:46 / SUNSET 19:57:13
                            </div>
                        </div>
                        {/* <div className="weather_item">
                            <div>Chicago</div>
                            <div>Partly cloudy</div>
                        </div>
                        <div className="weather_item">
                            <div>Temperature</div>
                            <div>77°F</div>
                        </div>
                        <div className="weather_item">
                            <div>Humidity</div>
                            <div>48%</div>
                        </div>
                        <div className="weather_item">
                            <div>Wind</div>
                            <div>↙15mph</div>
                        </div>
                        <div className="weather_item">
                            <div>Now</div>
                            <div>18:49:58</div>
                        </div>
                        <div className="weather_item">
                            <div>Sunrise</div>
                            <div>05:53:46</div>
                        </div>
                        <div className="weather_item">
                            <div>Sunset</div>
                            <div>19:57:13</div>
                        </div> */}
                    </div>
                    <div className="performance">
                        <div className="perf_item">
                            <div>CPU / 33% / 30 °C</div>
                        </div>
                        <div className="perf_item">
                            <div>MEM / 30% / 11.8 GB</div>
                        </div>
                    </div>
                </div>
                {/* <div className="dashboard">
                    {entries.map((entry, idx) => (
                        <div className="card" key={entry.category}>
                            <div className="card_title">{entry.category}</div>
                            <div className="card_content">
                                {entry.apps.map((app, idx) => (
                                    <div className="card_item" key={app.name}>
                                        {app.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div> */}
                <div className="dashboard">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        // onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={items}
                            strategy={rectSortingStrategy}
                        >
                            {items.map((entry, idx) => (
                                <SortableItem
                                    idx={idx}
                                    key={entry}
                                    entry={entry}
                                    // apps={entry.apps}
                                    // category={entry.category}
                                />
                            ))}
                        </SortableContext>
                        <DragOverlay adjustScale={true}>
                            {activeId ? (
                                <Card
                                    entry={activeId}
                                    style={{
                                        backgroundColor: 'var(--color-background)',
                                    }}
                                    idx={items.indexOf(activeId)}
                                />
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                </div>
            </main>
        </div>
    );
}

export default App;
