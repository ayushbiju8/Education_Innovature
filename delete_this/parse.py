employees = {
    ("John",-50000),
    ("Mary",70000),
    ("Peter",45000),
    ("David",80000),
}

emp_salary = {}
def calc_bonus(emp):
    emp = list(emp)
    for i in emp:
        if(i[1]<0):
            continue
        print(f"{i[0]} : {(i[1]*0.1)}")
        emp_salary[i[0]] = i[1]+(i[1]*0.1)

print("Bonus")
calc_bonus(employees)
print(emp_salary)

print("Greater than 60k")
total=0
for key,val in emp_salary.items():
    total+=val
    if val>60000:
        print(key)

print(f"Total Payroll = {total}")


