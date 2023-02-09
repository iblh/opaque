<script>
    // @ts-nocheck

    import { StoreKomorebi } from '$lib/stores.js';

    let komorebi;
    StoreKomorebi.subscribe((value) => {
        komorebi = value;
    });

    function clickOutside(node) {
        const handleClick = (event) => {
            if (
                node &&
                !node.contains(event.target) &&
                !event.defaultPrevented &&
                window.getComputedStyle(node).display !== 'none'
            ) {
                node.dispatchEvent(new CustomEvent('click_outside', node));
            }
        };

        document.addEventListener('mousedown', handleClick, true);

        return {
            destroy() {
                document.removeEventListener('mousedown', handleClick, true);
            },
        };
    }

    function handleClickOutside(event) {
        // set display to none
        const komorebi = document.getElementById('komorebi');
        komorebi.style.display = 'none';
    }
</script>

<div id="komorebi" use:clickOutside on:click_outside={handleClickOutside}>
    <div class="row">
        <div class="icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                ><title>format-text</title><path
                    d="M18.5,4L19.66,8.35L18.7,8.61C18.25,7.74 17.79,6.87 17.26,6.43C16.73,6 16.11,6 15.5,6H13V16.5C13,17 13,17.5 13.33,17.75C13.67,18 14.33,18 15,18V19H9V18C9.67,18 10.33,18 10.67,17.75C11,17.5 11,17 11,16.5V6H8.5C7.89,6 7.27,6 6.74,6.43C6.21,6.87 5.75,7.74 5.3,8.61L4.34,8.35L5.5,4H18.5Z"
                /></svg
            >
        </div>
        <input
            type="text"
            class="value"
            name="name"
            placeholder="Name"
            autocomplete="off"
            value={komorebi.name}
        />
    </div>
    <div class="row">
        <div class="icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                ><title>link</title><path
                    d="M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12M8,13H16V11H8V13M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.71 18.71,15.1 17,15.1H13V17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7Z"
                /></svg
            >
        </div>
        <input
            type="text"
            class="value"
            name="url"
            placeholder="URL"
            autocomplete="off"
            value={komorebi.url}
        />
    </div>
    <div class="row">
        <div class="icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                ><title>sticker-circle-outline</title><path
                    d="M12.12,18.46L18.3,12.28C16.94,12.59 15.31,13.2 14.07,14.46C13.04,15.5 12.39,16.83 12.12,18.46M20.75,10H21.05C21.44,10 21.79,10.27 21.93,10.64C22.07,11 22,11.43 21.7,11.71L11.7,21.71C11.5,21.9 11.26,22 11,22L10.64,21.93C10.27,21.79 10,21.44 10,21.05C9.84,17.66 10.73,14.96 12.66,13.03C15.5,10.2 19.62,10 20.75,10M12,2C16.5,2 20.34,5 21.58,9.11L20,9H19.42C18.24,6.07 15.36,4 12,4A8,8 0 0,0 4,12C4,15.36 6.07,18.24 9,19.42C8.97,20.13 9,20.85 9.11,21.57C5,20.33 2,16.5 2,12C2,6.47 6.5,2 12,2Z"
                /></svg
            >
        </div>
        <input
            type="text"
            class="value"
            name="icon"
            placeholder="Icon"
            autocomplete="off"
            value={komorebi.icon}
        />
    </div>
    <div class="ctrl">
        <div class="flex">
            <div class="icon" id="komorebi-confirm">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                    ><title>check</title><path
                        d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"
                    /></svg
                >
            </div>
            <div class="icon" id="komorebi-cancel">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                    ><title>close</title><path
                        d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"
                    /></svg
                >
            </div>
        </div>
        <div>
            <div class="icon" id="komorebi-delete">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                    ><title>delete-outline</title><path
                        d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z"
                    /></svg
                >
            </div>
        </div>
    </div>
</div>

<style>
    #komorebi {
        position: absolute;
        display: none;
        width: 0;
        flex-direction: column;
        align-items: center;
        padding: 10px 0;
        box-sizing: border-box;
        font-size: 14px;
        background: rgba(70, 78, 46, 0.75);
        color: var(--color-beige);
        backdrop-filter: blur(2px);
        /* shadow28 - dark  */
        box-shadow: rgb(0 0 0 / 24%) 0px 0px 8px, rgb(0 0 0 / 28%) 0px 14px 28px,
            inset 0px 0px 0px 1.4px var(--color-primary);
    }

    #komorebi .icon {
        width: 18px;
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    #komorebi .icon svg {
        width: 100%;
        height: 100%;
        fill: var(--color-beige);
    }

    #komorebi .row {
        display: flex;
        align-items: center;
        width: 100%;
        margin-bottom: 7px;
        padding: 2px 7px;
    }

    #komorebi .ctrl {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        margin-top: 10px;
        padding: 0 7px;
    }

    #komorebi input {
        all: unset;
        width: 100%;
        flex: 1;
        margin: 0 6px;
        border-bottom: 1px solid rgba(239, 234, 216, 0.7);
    }

    #komorebi input[type='text'] {
        font-size: 14px;
    }

    #komorebi ::-webkit-input-placeholder {
        /* WebKit, Blink, Edge */
        color: rgba(239, 234, 216, 0.55);
    }
    #komorebi :-moz-placeholder {
        /* Mozilla Firefox 4 to 18 */
        color: rgba(239, 234, 216, 0.55);
        opacity: 1;
    }
    #komorebi ::-moz-placeholder {
        /* Mozilla Firefox 19+ */
        color: rgba(239, 234, 216, 0.55);
        opacity: 1;
    }
    #komorebi :-ms-input-placeholder {
        /* Internet Explorer 10-11 */
        color: rgba(239, 234, 216, 0.55);
    }
    #komorebi ::-ms-input-placeholder {
        /* Microsoft Edge */
        color: rgba(239, 234, 216, 0.55);
    }

    #komorebi ::placeholder {
        /* Most modern browsers support this now. */
        color: rgba(239, 234, 216, 0.55);
    }
</style>
