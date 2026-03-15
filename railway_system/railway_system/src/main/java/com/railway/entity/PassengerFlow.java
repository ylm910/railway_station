package com.railway.entity;

import lombok.Data;
import java.util.Date;

/**
 * 客运量实体类 - 完整字段
 */
@Data
public class PassengerFlow {
    private Integer id;
    
    // 基础信息
    private Integer lineId;              // 运营线路编码 (yyxlbm)
    private Integer trainId;             // 列车编码 (ldtrm)
    private Integer stationId;           // 站点ID (zkld)
    private Integer skzld;               // 上客站点
    private Integer sxbm;                // 上下编码
    private Date flowDate;               // 运营日期 (yxrq)
    private String operateTime;          // 运营时间 (ysrj)
    private String timeInterval;         // 运营时间间隔 (yxdsjj)
    
    // 时间相关
    private String startStationTime;     // 始发站时点 (sfszsd)
    private String startStationDepart;   // 始发站到时 (sfzdst)
    private String arriveTime;           // 到达时间 (cdzc)
    private String departTime;           // 出发时间 (cfzj)
    
    // 客流相关
    private Integer boarding;            // 上客量 (skl)
    private Integer alighting;           // 下客量 (xkl)
    private String remark;               // 备注 (bz)
    private String trainDepartDate;      // 列车出发日期 (lccfrq)
    private String trainDepartTime;      // 列车出发时间 (lccsj)
    private Integer sequenceNo;          // 站点序号 (zdxh)
    
    // 票务相关
    private String ticketType;           // 车票类型 (ticket_type)
    private Double ticketPrice;          // 车票价格 (ticket_prio)
    private String seatType;             // 座位类型 (seat_type)
    private String trainCopo;            // 列车编组 (train_copo)
    private String ticketDate;           // 购票日期 (ksrq)
    
    // 站点相关
    private Integer originStationId;     // 起点站ID (start_station)
    private String originStationStatic;  // 起点站静态 (start_static)
    private String originStationStart;   // 起点站起始 (start_start)
    private Integer destStationId;       // 终点站ID (end_station)
    private String destStationStatic;    // 终点站静态 (end_static)
    private String destStationEnd;       // 终点站终止 (end_end)
    
    // 列车相关
    private String trainClass;           // 列车等级 (train_class)
    private String trainType;            // 列车类型 (train_type)
    
    // 其他
    private Integer saleStationId;       // 售票站ID (sale_station)
    private Integer stationLimit;        // 限制站 (station_limit)
    private String staticSps;            // 静态SPS (static_sps)
    private Integer toStationId;         // 到达站ID (to_station)
    private Double revenue;              // 收入 (shouru)
    
    // 扩展字段
    private String kill;                 // kill字段
    private String sokl;                 // sokl字段
    private String kofig;                // kofig字段
}
