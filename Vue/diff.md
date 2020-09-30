#### diff

版本：@2.6.10

背景:是在比较children vnode时使用的。

描述：diff是vue比较同级vnode的一种算法,以新的vnode的位置为标准调整旧vnode的位置,是为了就地复用。

过程：

```javascript
oldVnode: $1 $2 $3 $4
newVnode: $5 $4 $3 $2 $1
保存oldVnode的 oldStartIndex oldEndIndex
保存newVnode的 newStartIndex newEndIndex

【首先对比新旧vnode的开始和结束，分为四种情况：】
 newStartIndex   VS  oldStartIndex
 oldEndIndex     VS  newEndIndex
 newStartIndex   VS  oldEndIndex
 newEndIndex     VS  oldStartIndex
判定相同的条件是 (key相同,标签相同，都有/无data,如果是input类型就判定type) 
假如例子满足第四种情况, 
   - 移动 oldStartIndex 到 oldEndIndex 下一个的前面,
   	  oldVnode: $2 $3 $4 $1 
   	  newVnode: $5 $4 $3 $2 $1
   - ++oldStartIndex  --oldEndIndex 指向了 new$2 old$2 与前一步相同。
   - 重复移动后 
		oldVnode: $4 $3 $2 $1 
   	    newVnode: $5 $4 $3 $2 $1
        
		oldvnode：oldStartIndex(3) === oldEndIndex(3) 且都指向了$4
		newVnode：newEndIndex(1) 指向了$4 newStartIndex(0)
        因此还是执行前面的步骤但是这次oldvnode 的$4相当于没动 
        index继续变化导致 oldStartIndex(4) >  oldEndIndex(3) 
						newStartIndex(0) <= newEndIndex(0) 【代表着旧的vnode已经都遍历了一遍。在这种情况下如果newStartIndex <= newEndIndex 证明新的vnode增加了节点因此需要将节点添加到旧的节点中。
通过判断newEndIndex后面是否有vnode,如果有的话说明新增的节点需要放到前面，没有说明新增的节点需要放到后面， 以此来推断新增节点的位置，增加到真实节点中】 
【当不满足上面的对比时:】
建立 oldVnode 的 key：index 映射表，以 newVnode 第一个开始遍历，
当 Vnode 定义 key 的时候去表中寻找对应的vnode，没定义key就去表中遍历对比寻找。
当没有找到时，就在 oldStartIndex 前面插入新的节点。
找到时，判断找到的节点与新节点是否相同，相同就将旧节点的dom插入到 oldStartIndex对应节点的前面，并从表中删除        对应的key：index，不相同就按照新建节点处理，再 newStartIndex 向右移动。再判断是否满足上面四种情况，(假设一直不满足以上四种情况)，将新的所有节点都插入parent后，最终newStartIndex >= newEndIndex【代表所有的新vnode已经处理完毕，如果旧vnode  oldStartIndex <= oldEndIndex 那么 oldStartIndex - oldEndIndex 的所有的节点都需要删除。】

```

