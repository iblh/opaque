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
import { SortableCard } from './SortableCard';
import { Card } from './Card';
import entries from './entries.json';

import './App.css';

function App() {
    const [editMode, setEditMode] = useState(false);
    const [cats, setCats] = useState([
        'Productivity',
        'Development',
        'Linux',
        'Media',
        'Design',
        'Life Style',
        'Networking',
    ]);
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
            setCats((cats) => {
                const oldIndex = cats.indexOf(active.id);
                const newIndex = cats.indexOf(over.id);

                return arrayMove(cats, oldIndex, newIndex);
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
                    {/* <div className="weather">
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
                        <div className="weather_item">
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
                        </div>
                    </div>
                    <div className="performance">
                        <div className="perf_item">
                            <div>CPU / 33% / 30 °C</div>
                        </div>
                        <div className="perf_item">
                            <div>MEM / 30% / 11.8 GB</div>
                        </div>
                    </div> */}
                    <button
                        onClick={() => setEditMode(!editMode)}
                        className="edit"
                    >
                        edit
                    </button>
                </div>

                {!editMode ? (
                    <div className="dashboard">
                        {cats.map((cat, idx) => (
                            <div className="card" key={cat}>
                                <div className="card_title">{cat}</div>
                                <div className="card_content">
                                    {entries[cat as keyof typeof entries].map(
                                        (app, idx) => (
                                            <div
                                                className="card_item"
                                                key={app.name}
                                            >
                                                {app.name}
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="dashboard">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragStart={handleDragStart}
                            // onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={cats}
                                strategy={rectSortingStrategy}
                            >
                                {cats.map((cat, idx) => (
                                    <SortableCard
                                        idx={idx}
                                        key={cat}
                                        cat={cat}
                                    />
                                ))}
                            </SortableContext>
                            <DragOverlay adjustScale={true}>
                                {activeId ? (
                                    <Card
                                        cat={activeId}
                                        style={{
                                            backgroundColor:
                                                'var(--color-background)',
                                            boxShadow:
                                                'rgba(17, 12, 46, 0.15) 0px 48px 100px 0px',
                                            boxShadow:
                                                'rgba(17, 17, 26, 0.1) 0px 1px 0px, rgba(17, 17, 26, 0.1) 0px 8px 24px, rgba(17, 17, 26, 0.1) 0px 16px 48px',
                                        }}
                                        idx={cats.indexOf(activeId)}
                                    />
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;
