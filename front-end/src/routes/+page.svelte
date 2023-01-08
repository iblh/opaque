<script>
    import Counter from './Counter.svelte';

    /** @type {import('./$types').PageData} */
    export let data;

    console.log('dashboard data: ', data);
</script>

<svelte:head>
    <title>OPAQUE</title>
    <meta name="description" content="OPAQUE" />
</svelte:head>

<div id="nav">
    <!-- search -->
    <input id="search" type="text" placeholder="search" />

    <!-- <Counter /> -->
</div>
<!-- <div id="dashboard">
    {#each data.dashboard.temp_content as item}
        <div class="section">{item.root}</div>
    {/each}


</div> -->

<style>
    #nav {
        display: flex;
    }
    #search {
        all: unset;
        width: 100%;
        height: 30px;
        border-bottom: 1px solid #ccc;
        padding: 0 10px;
    }
</style>
