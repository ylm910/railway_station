package com.railway.controller;

import com.railway.entity.Train;
import com.railway.service.TrainService;
import com.railway.common.Result;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trains")
public class TrainController {
    
    @Autowired
    private TrainService trainService;
    
    @GetMapping
    public Result<List<Train>> list() {
        return Result.success(trainService.findAll());
    }
    
    @GetMapping("/{id}")
    public Result<Train> get(@PathVariable Integer id) {
        Train train = trainService.findById(id);
        if (train == null) {
            return Result.error("列车不存在");
        }
        return Result.success(train);
    }
    
    @PostMapping
    public Result<String> save(@RequestBody Train train) {
        trainService.save(train);
        return Result.success("保存成功");
    }
    
    @DeleteMapping("/{id}")
    public Result<String> delete(@PathVariable Integer id) {
        trainService.delete(id);
        return Result.success("删除成功");
    }
    
    @GetMapping("/count")
    public Result<Integer> count() {
        return Result.success(trainService.count());
    }
    
    @GetMapping("/types")
    public Result<?> countByType() {
        return Result.success(trainService.countByType());
    }
}
