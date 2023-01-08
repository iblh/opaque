<script>
    import Header from './Header.svelte';
    import './styles.css';
</script>

<div class="app">
    <Header />

    <main>
        <slot />
    </main>

    <footer>
        <p>© OPAQUE</p>
    </footer>
</div>

<style>
    .app {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
    }

    main {
        flex: 1;
        display: flex;
        flex-direction: column;
        max-width: 1440px;
        margin: 0 auto;
    }

    footer {
        font-size: 12px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 12px;
    }

    @media (min-width: 480px) {
        footer {
            padding: 12px 0;
        }
    }
</style>
