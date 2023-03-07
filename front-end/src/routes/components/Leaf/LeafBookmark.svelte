<script>
</script>

<!-- svelte-ignore missing-declaration -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class="leaf-wrapper"
    class:hovered={settings.show & (hoveredLeafId === leaf.id)}
    class:editing={settings.show & (editingLeafId === leaf.id)}
    use:clickLeafOutside
    on:click={(event) => handleLeafClick(event, branch.id, leaf)}
    on:mouseenter={() => {
        hoveredLeafId = leaf.id;
    }}
    on:mouseleave={() => {
        hoveredLeafId = null;
    }}
    on:leaf_click_outside={(event) => handleCancelLeafEditing(event, leaf)}
>
    <div class="leaf-bm" class:hide={settings.show & (editingLeafId === leaf.id)}>
        <div class="leaf-bm-icon">
            {@html leaf.icon}
        </div>
        <div class="leaf-bm-name">
            <div class="line overline" />
            <div>
                {leaf.name}
            </div>
            <div class="line underline" />
        </div>
    </div>
    <form class="leaf-bm-form" class:displayed={settings.show & (editingLeafId === leaf.id)}>
        <div class="row">
            <div class="icon">
                {@html leaf.icon}
            </div>
            <div class="value">
                <div class="line overline" />
                <input
                    type="text"
                    class="leaf-bm-input-name"
                    name="name"
                    placeholder="Name"
                    autocomplete="off"
                    spellcheck="false"
                    value={leaf.name}
                />
                <div class="line underline" />
            </div>
        </div>
        <div class="row">
            <div class="icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                        d="M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12M8,13H16V11H8V13M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.71 18.71,15.1 17,15.1H13V17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7Z"
                    />
                </svg>
            </div>
            <div class="value">
                <div class="line overline" />
                <input
                    type="text"
                    class="leaf-bm-input-url"
                    name="url"
                    placeholder="URL"
                    autocomplete="off"
                    spellcheck="false"
                    value={leaf.url}
                />
                <div class="line underline" />
            </div>
        </div>
        <div class="row">
            <div class="icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                        d="M12.12,18.46L18.3,12.28C16.94,12.59 15.31,13.2 14.07,14.46C13.04,15.5 12.39,16.83 12.12,18.46M20.75,10H21.05C21.44,10 21.79,10.27 21.93,10.64C22.07,11 22,11.43 21.7,11.71L11.7,21.71C11.5,21.9 11.26,22 11,22L10.64,21.93C10.27,21.79 10,21.44 10,21.05C9.84,17.66 10.73,14.96 12.66,13.03C15.5,10.2 19.62,10 20.75,10M12,2C16.5,2 20.34,5 21.58,9.11L20,9H19.42C18.24,6.07 15.36,4 12,4A8,8 0 0,0 4,12C4,15.36 6.07,18.24 9,19.42C8.97,20.13 9,20.85 9.11,21.57C5,20.33 2,16.5 2,12C2,6.47 6.5,2 12,2Z"
                    />
                </svg>
            </div>
            <div class="value">
                <div class="line overline" />
                <input
                    type="text"
                    class="leaf-bm-input-icon"
                    name="icon"
                    placeholder="Icon"
                    autocomplete="off"
                    spellcheck="false"
                    value={leaf.icon}
                />
                <div class="line underline" />
            </div>
        </div>
        <div class="ctrl">
            <div class="flex">
                <!-- confirm btn -->
                <button type="submit" class="btn">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                    </svg>
                </button>
                <!-- cancel btn -->
                <button
                    class="btn"
                    on:click={(event) => handleCancelLeafEditing(event, leaf)}
                    on:keydown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ')
                            handleCancelLeafEditing(event, leaf);
                    }}
                    style="margin-left: 7px;"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path
                            d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"
                        />
                    </svg>
                </button>
            </div>
            <button type="button" class="btn">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M19,13H5V11H19V13Z" />
                </svg>
            </button>
        </div>
    </form>
</div>
