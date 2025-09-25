# JSing 笔记
## JS基础信息
### Chrome snippets 小脚本
### js输出
- 使用 window.alert() 弹出警告框。
- 使用 document.write() 方法将内容写到 HTML 文档中。
- 使用 innerHTML 写入到 HTML 元素。
- 使用 console.log() 写入到浏览器的控制台。
### 语法
JavaScript 字面量
- 数字字面量：123、3.14、0xff、0777、Infinity、-Infinity、NaN。 
- 字符串字面量：'hello'、"world"。
- 布尔字面量：true、false。
- 数组字面量：['apple', 'banana', 'orange']。
- 对象字面量：{name: 'John', age: 30, city: 'New York'}。
- 函数字面量：function() { console.log('Hello, world!'); }。
- 正则表达式字面量：/pattern/flags。
### 变量
- 关键字 var 来定义变量， 使用等号来为变量赋值：
  ```javascript
    var x, length
    x = 5
    length = 6
  ```
- 变量名必须以字母、下划线或美元符号开头。
- 变量名不能包含空格、数字、点、连字符、冒号、等号、单引号、双引号、反斜杠、问号、感叹号、井号、波浪线。
- 变量名区分大小写。
- 变量名不能与 JavaScript 关键字相同。
- 变量名不能与系统保留字相同。
- 变量名不能以数字开头。
- 变量名应该使用驼峰命名法。

### 语句标识符 (关键字) 
| 语句         | 描述|
| ------------ | ----------------- |
| break        | 用于跳出循环。                                                   |
| case         | 用于 switch 语句。                                               |
| catch        | 在 try 语句块执行出错时执行 catch 语句块。                       |
| continue     | 跳过循环中的一个迭代。                                           |
| do ... while | 执行一个语句块，在条件语句为 true 时继续执行该语句块。           |
| for          | 在条件语句为 true 时，可以将代码块执行指定的次数。               |
| for ... in   | 用于遍历数组或者对象的属性（对数组或者对象的属性进行循环操作）。 |
| function     | 定义一个函数。                                                   |
| if ... else  | 用于基于不同的条件来执行不同的动作。                             |
| return       | 返回结果，并退出函数。                                           |
| switch       | 用于基于不同的条件来执行不同的动作。                             |
| throw        | 抛出（生成）错误。                                               |
| try          | 实现错误处理，与 catch 一同使用。                                |
| var          | 声明一个变量。                                                   |
| while        | 当条件语句为 true 时，执行语句块。                               |

### 变量声明
可以使用 var、let 和 const 关键字来声明变量。
1. **var**：ES5 引入的变量声明方式，具有**函数作用域**。
    1. 变量可以重复声明（覆盖原变量）。
    2. 变量未赋值时，默认值为 undefined。
    3. var 声明的变量会提升（Hoisting），提升到函数的最前面,但不会初始化
```markdown
### 变量提升

JavaScript引擎的工作方式是，先解析代码，获取所有被声明的变量，然后再一行一行地运行。这造成的结果，就是所有的变量声明语句，都会被提升到代码的头部，这就叫做变量提升（hoisting）。

console.log(num);
var num = 10; // 结果是什么呢？
var num;

console.log(num); // 这时 num 是 undefined
num = 10;
这样格式化后，代码和解释更加清晰，便于阅读和理解。
```


1. **let：**ES6 引入的变量声明方式，具有块级作用域。
   ```javascript
    let city = "北京";
    let age = 30;
    console.log(city, age); // 输出: 北京 30  
    ```
   
2. **const：**ES6 引入的**常量声**明方式，具有块级作用域，且值不可变。
   - 一旦赋值后，变量的值不能再被修改。

### 数据类型
- 值类型(基本类型)：字符串（String）、数字(Number)、布尔(Boolean)、空（Null）、未定义（Undefined）、Symbol。

- 引用数据类型（对象类型）：对象(Object)、数组(Array)、函数(Function)

- 还有两个特殊的对象：正则（RegExp）和日期（Date）。

变量的数据类型可以使用 typeof 操作符来查看：
```javascript
//变量的数据类型可以使用 typeof 操作符来查看：
typeof "John"                // 返回 string
typeof 3.14                  // 返回 number
typeof false                 // 返回 boolean
typeof [1,2,3,4]             // 返回 object
typeof {name:'John', age:34} // 返回 object

//正确检测数组的方法：
Array.isArray([1,2,3]); // true
[1,2,3] instanceof Array; // true



// 数字 极大或极小的数字可以通过科学（指数）计数法来书写
var y=123e5;      //12300000
var z=123e-5;     // 0.00123

// 数组
var cars=new Array();
cars[0]="Saab";
cars[1]="Volvo";
cars[2]="BMW";

var cars=new Array("Saab","Volvo","BMW"); // 或者 (condensed array):
var cars=["Saab","Volvo","BMW"]; // 或者 (literal array)

// 对象 // 对象属性有两种寻址方式
var person={firstname:"John", lastname:"Doe", id:5566};

name=person.lastname;
name=person["lastname"];
```

### 对象（变量的容器）
对象是属性的集合，属性由键值对组成。对象可以包含多个值（多个变量），每个值以 name:value 对呈现。
```javascript
var car = {name:"Fiat", model:500, color:"white"};

// 3 个值 ("Fiat", 500, "white") 赋予变量 car。
```
#### 对象方法
对象方法通过添加 () 调用 (作为一个函数)

```javascript
var person = {
    firstName: "John",
    lastName: "Doe",
    age: 50,
    eyeColor: "blue",
    fullName: function() {
        return this.firstName + " " + this.lastName;
    }
};

try {
    var name = person.fullName(); // 访问了 person 对象的 fullName() 方法
    console.log(name); // 输出: John Doe
    // name = person.fullName; // 这行代码是多余的，且会返回 fullName 函数本身而不是其调用结果
} catch (error) {
    console.error("调用 fullName 方法时出错: " + error.message);
}
```








