<script>
    // @ts-nocheck

    export let tree;
</script>

<div class="trunk">
    {#each tree.branches as branch}
        <div class="branch">
            <div class="branch-name">{branch.name}</div>
            {#each branch.leaves as leaf}
                <div class="leaf ">
                    <div class="leaf-app-icon">
                        {@html leaf.icon}
                    </div>
                    <div class="leaf-app-info">
                        <div class="leaf-app-name">
                            {leaf.name}
                        </div>
                        <div class="leaf-app-url">
                            <!-- remove protocol -->
                            {leaf.url.replace(/(^\w+:|^)\/\//, '')}
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {/each}
</div>
