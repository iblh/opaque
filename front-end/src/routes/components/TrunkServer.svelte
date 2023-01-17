<script>
    // @ts-nocheck

    export let tree;
</script>

<div class="trunk">
    {#each tree.twigs as twig}
        <div class="twig">
            <div class="twig-icon">
                {@html twig.icon}
            </div>
            <div class="twig-info">
                <div class="twig-name">
                    {twig.name}
                </div>

                <div class="twig-url">
                    <!-- remove protocol -->
                    {twig.url.replace(/(^\w+:|^)\/\//, '')}
                </div>
            </div>
        </div>
    {/each}
</div>
